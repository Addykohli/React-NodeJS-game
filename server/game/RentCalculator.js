const { tiles } = require('../data/tiles.cjs');

function getPropertiesByDivision(properties) {
  return properties.reduce((acc, propertyId) => {
    const property = tiles.find(t => t.id === propertyId);
    if (property && property.division) {
      if (!acc[property.division]) {
        acc[property.division] = [];
      }
      acc[property.division].push(property);
    }
    return acc;
  }, {});
}

function calculateRentMultiplier(propertyId, ownerProperties) {
  const property = tiles.find(t => t.id === propertyId);
  if (!property || !property.division) return 1;

  const propertiesByDivision = getPropertiesByDivision(ownerProperties);
  const divisionProperties = propertiesByDivision[property.division] || [];
  const count = divisionProperties.length;

  if (property.division === 'tech') {
    if (count >= 6) return 5; // All 6 tech properties
    if (count >= 5) return 4; // Any 5 tech properties
    const hasGoogle = ownerProperties.includes(37);
    const hasApple = ownerProperties.includes(36);
    const hasAmazon = ownerProperties.includes(41);
    if (hasGoogle && hasApple && hasAmazon) return 3; // Special tech trio
    const bigTechCount = [hasGoogle, hasApple, hasAmazon].filter(Boolean).length;
    if (bigTechCount >= 2) return 2; // Any 2 of the big tech companies
    if (count >= 3) return 2; // Any 3 tech properties
    return 1;
  } else {
    if (count >= 6) return 5;  // 6 properties
    if (count >= 5) return 3;  // 5 properties
    if (count >= 3) return 2;  // 3 properties
    return 1;
  }
}

module.exports = { calculateRentMultiplier };