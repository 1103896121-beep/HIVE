// NOTE: country-state-city 通过动态 import() 加载，避免模块加载时解析 10MB+ JSON 导致 iOS 栈溢出

export interface LocationNode {
    id: string;
    name: string;
    type: 'continent' | 'country' | 'province' | 'city';
    parent?: string;
    children: { id: string; name: string }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function initializeLocations(): Promise<LocationNode[]> {
    const { Country, State, City } = await import('country-state-city');

    const dataMap = new Map<string, LocationNode>();

    const addNode = (node: LocationNode) => {
        dataMap.set(node.id, node);
    };

    // 1. Continents
    const continents = ['Asia', 'Europe', 'Africa', 'Oceania', 'Americas', 'Antarctica'];
    const globalNode: LocationNode = {
        id: 'Global',
        name: 'Global',
        type: 'continent',
        children: continents.map(c => ({ id: `continent:${c}`, name: c }))
    };
    addNode(globalNode);

    continents.forEach(c => {
        addNode({
            id: `continent:${c}`,
            name: c,
            type: 'continent',
            parent: 'Global',
            children: []
        });
    });

    const allCountries = Country.getAllCountries().filter((c: { isoCode: string }) => !['TW', 'HK', 'MO'].includes(c.isoCode));
    allCountries.forEach((country: { isoCode: string; name: string; timezones?: { zoneName: string }[] }) => {
        const tz = country.timezones?.[0]?.zoneName || '';
        let region = 'Americas';
        if (tz.startsWith('Asia')) region = 'Asia';
        else if (tz.startsWith('Europe')) region = 'Europe';
        else if (tz.startsWith('Africa')) region = 'Africa';
        else if (tz.startsWith('Australia') || tz.startsWith('Pacific')) region = 'Oceania';
        else if (tz.startsWith('Antarctica')) region = 'Antarctica';

        const continentId = `continent:${region}`;
        const continentNode = dataMap.get(continentId);
        if (continentNode) {
            continentNode.children.push({ id: `country:${country.isoCode}`, name: country.name });
        }

        addNode({
            id: `country:${country.isoCode}`,
            name: country.name,
            type: 'country',
            parent: continentNode ? continentNode.name : region,
            children: []
        });
    });

    const allStates = State.getAllStates();
    allStates.forEach((state: { countryCode: string; isoCode: string; name: string }) => {
        const countryId = `country:${state.countryCode}`;
        const countryNode = dataMap.get(countryId);

        if (countryNode) {
            countryNode.children.push({ id: `state:${state.countryCode}-${state.isoCode}`, name: state.name });
        }

        addNode({
            id: `state:${state.countryCode}-${state.isoCode}`,
            name: state.name,
            type: 'province',
            parent: countryNode ? countryNode.name : '',
            children: []
        });
    });

    const allCities = City.getAllCities();
    allCities.forEach((city: { countryCode: string; stateCode: string; name: string }) => {
        let countryCode = city.countryCode;
        let stateCode = city.stateCode;

        // Fix library bug: Jiangsu cities are erroneously mapped to stateCode 'TW' under 'CN'
        if (countryCode === 'CN' && stateCode === 'TW') {
            stateCode = 'JS';
        }

        // Map Special Administrative Regions and Taiwan under China
        if (['TW', 'HK', 'MO'].includes(countryCode)) {
            stateCode = countryCode;
            countryCode = 'CN';
        }

        const stateId = `state:${countryCode}-${stateCode}`;
        const stateNode = dataMap.get(stateId);
        const cityId = `city:${countryCode}-${stateCode}-${city.name}`;

        if (stateNode) {
            if (!stateNode.children.find(c => c.name === city.name)) {
                stateNode.children.push({ id: cityId, name: city.name });
            }
        } else {
            const cId = `country:${countryCode}`;
            const countryNode = dataMap.get(cId);
            if (countryNode) {
                if (!countryNode.children.find(c => c.name === city.name)) {
                    countryNode.children.push({ id: cityId, name: city.name });
                }
            }
        }

        addNode({
            id: cityId,
            name: city.name,
            type: 'city',
            parent: stateNode ? stateNode.name : (dataMap.get(`country:${countryCode}`)?.name || ''),
            children: []
        });
    });

    return Array.from(dataMap.values());
}

// NOTE: 异步懒加载，只在用户首次打开地区选择器时触发
let _locationCache: LocationNode[] | null = null;
let _loadingPromise: Promise<LocationNode[]> | null = null;

export async function getLocationData(): Promise<LocationNode[]> {
    if (_locationCache) return _locationCache;
    if (!_loadingPromise) {
        _loadingPromise = initializeLocations().then(data => {
            _locationCache = data;
            return data;
        });
    }
    return _loadingPromise;
}
