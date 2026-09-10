/**
 * SIH 2026 - Hyper-Local Business Advisor
 * Author: Ayush
 */

export const MEERUT_DATA = {
    district: "Meerut",
    state: "Uttar Pradesh",
    bottlenecks: [
        "Extreme summer temperatures peaking at 46°C affecting perishables",
        "High concentration and saturation of sporting goods micro-units",
        "Groundwater dependency for agriculture/dairy in dry winter months"
    ],
    tehsils: {
        "Meerut": { density: 2262, type: "Urban/Peri-urban Hub", clusters: ["Retail", "Sports Goods", "Textiles"] },
        "Sardhana": { density: 972, type: "Semi-Urban / Agricultural", clusters: ["Handloom", "Dairy", "Sugarcane"] },
        "Mawana": { density: 740, type: "Rural / Agro-Industrial", clusters: ["Sugar Mills", "Poultry", "Dairy Farming"] }
    }
};

export function getTehsilMarketReach(district: string, tehsil: string, radiusKm: number = 5) {
    if (district.toLowerCase() !== "meerut") return null;

    const tName = Object.keys(MEERUT_DATA.tehsils).find(k => k.toLowerCase() === tehsil.toLowerCase());
    const tInfo = tName ? MEERUT_DATA.tehsils[tName as keyof typeof MEERUT_DATA.tehsils] : null;
    
    const density = tInfo ? tInfo.density : 1346; 
    const areaSqKm = Math.PI * Math.pow(radiusKm, 2);
    const consumers = Math.floor(areaSqKm * density);
    
    return {
        radius_km: radiusKm,
        reachable_consumers: consumers,
        reachable_households: Math.floor(consumers / 5.95),
        zone_classification: tInfo ? tInfo.type : "District Baseline",
        dominant_local_clusters: tInfo ? tInfo.clusters : [],
        district_bottlenecks: MEERUT_DATA.bottlenecks
    };
}
