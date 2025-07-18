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
    if (count >= 6) return 5;
    if (count >= 5) return 4;
    const hasGoogle = ownerProperties.includes(37);
    const hasApple = ownerProperties.includes(36);
    const hasAmazon = ownerProperties.includes(41);
    if (hasGoogle && hasApple && hasAmazon) return 3;
    const bigTechCount = [hasGoogle, hasApple, hasAmazon].filter(Boolean).length;
    if (bigTechCount >= 2) return 2;
    if (count >= 3) return 2;
    return 1;
  } else {
    if (count >= 6) return 5;
    if (count >= 5) return 3;
    if (count >= 3) return 2;
    return 1;
  }
}

module.exports = { calculateRentMultiplier };