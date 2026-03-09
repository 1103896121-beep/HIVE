import { Country, State, City } from 'country-state-city';

export interface LocationNode {
    id: string;
    name: string;
    type: 'continent' | 'country' | 'province' | 'city';
    parent?: string;
    children: { id: string; name: string }[];
}

export function initializeLocations(): LocationNode[] {
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

    const allCountries = Country.getAllCountries().filter(c => !['TW', 'HK', 'MO'].includes(c.isoCode));
    allCountries.forEach(country => {
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
    allStates.forEach(state => {
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
    // Some cities might belong directly to countries if no states exist
    allCities.forEach(city => {
        let countryCode = city.countryCode;
        let stateCode = city.stateCode;

        // Fix library bug: Jiangsu cities are erroneously mapped to stateCode 'TW' under 'CN'
        if (countryCode === 'CN' && stateCode === 'TW') {
            stateCode = 'JS'; // Route them back to Jiangsu
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
            // Avoid exact name duplicates
            if (!stateNode.children.find(c => c.name === city.name)) {
                stateNode.children.push({ id: cityId, name: city.name });
            }
        } else {
            const countryId = `country:${countryCode}`;
            const countryNode = dataMap.get(countryId);
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

export const LOCATION_DATA = initializeLocations();
