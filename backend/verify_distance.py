import math

def haversine(lat1, lon1, lat2, lon2):
    # 将经纬度转换为弧度
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    
    # Haversine 公式计算
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    dist = 6371 * c # km
    return dist

# 测试数据
BEIJING_CENTER = (39.9042, 116.4074)
SHANGHAI_CENTER = (31.2304, 121.4737)

distance = haversine(*BEIJING_CENTER, *SHANGHAI_CENTER)
print(f"Distance between Beijing and Shanghai: {distance:.2f} km")

# 预期值约为 1068 km
if 1060 < distance < 1075:
    print("Verification SUCCESS: Haversine calculation is accurate.")
else:
    print("Verification FAILED: Distance deviates significantly.")
