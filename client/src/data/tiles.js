export const tiles = [

  {
    id: 1,
    name: 'Start',
    type: 'event',
    position: { x: 90, y: 90 },
    next: [
      { from: 30, roll: 'any', to: 2 },
    ]
  },
  
  {
      id: 2,
      name: 'Choose corner',
      type: 'event',
      position: { x: 75, y: 260 },
      next: [
      { from: 1, roll: 'any', to: 3 }
          ],
    },
  
    {
      id: 3,
      name: 'Samsung',
      type: 'property',
      division: 'tech',
      position: { x: 72, y: 431 },
      next: [
      { from: 2, roll: 'any', to: 4 }
          ],
      cost: 12500,
      rent: 3000
    },
    
    {
      id: 4,
      name: 'Pizza Hut',
      type: 'property',
      division: 'food',
      position: { x: 72, y: 582 },
      next: [
      { from: 3, roll: 'any', to: 5 }
          ],
      cost: 3000,
      rent: 1000
    },
  
    {
      id: 5,
      name: 'Addidas',
      type: 'property',
      division: 'sports',
      position: { x: 72, y: 740 },
      next: [
      { from: 4, roll: 'any', to: 6 }
          ],
      cost: 6500,
      rent: 1500
    },
  
    {
      id: 6,
      name: 'Sniper Magnum',
      type: 'property',
      division: 'weapons',
      position: { x: 72, y: 900 },
      next: [
      { from: 5, roll: 'above', to: 31 },
      { from: 5, roll: 'below', to: 7 },
      { from: 31, roll: 'any', to: 7 }
      ],
      cost: 10500,
      rent: 3500
    },
  
    {
      id: 7,
      name: 'Hotel',
      type: 'event',
      position: { x: 90, y: 1080 },
      next: [
      { from: 6, roll: 'any', to: 8 }
          ]
    },
  
    { id: 8,
      name: 'Burger King',
      type: 'property',
      division: 'food',
      position: { x: 300, y: 1090 },
      next: [
      { from: 7, roll: 'any', to: 9 }
          ],
      cost: 3500,
      rent: 500
    },
  
    { id: 9,
      name: 'Reebok',
      type: 'property',
      division: 'sports',
      position: { x: 505, y: 1090 },
      next: [
      { from: 8, roll: 'any', to: 10 }
          ],
      cost: 7500,
      rent: 2500
    },
  
    { id: 10,
      name: 'Pump Up',
      type: 'property',
      division: 'weapons',
      position: { x: 720, y: 1090 },
      next: [
      { from: 9, roll: 'any', to: 11 }
          ],
      cost: 8500,
      rent: 3000
    },
  
    { id: 11,
      name: 'Choose corner',
      type: 'Event',
      position: { x: 920, y: 1090 },
      next: [
      { from: 10, roll: 'any', to: 12 }
          ]
    },
  
    { id: 12,
      name: 'Yonex',
      type: 'property',
      division: 'sports',
      position: { x: 1115, y: 1090 },
      next: [
      { from: 11, roll: 'below', to: 13 },
      { from: 11, roll: 'above', to: 45 },
      { from: 45, roll: 'any', to: 13 }
          ],
      cost: 5000,
      rent: 1500
    },
  
    { id: 13,
      name: 'Major Lazer',
      type: 'property',
      division: 'dj',
      position: { x: 1320, y: 1090 },
      next: [
      { from: 12, roll: 'any', to: 14 }
          ],
      cost: 6500,
      rent: 1500
    },
  
    { id: 14,
      name: 'Flashbang',
      type: 'property',
      division: 'weapons',
      position: { x: 1525, y: 1090 },
      next: [
      { from: 13, roll: 'any', to: 15 }
          ],
      cost: 1500,
      rent: 500
    },
  
    { id: 15,
      name: 'Unreal Engine',
      type: 'property',
      division: 'gaming',
      position: { x: 1740, y: 1090 },
      next: [
      { from: 14, roll: 'any', to: 16 }
          ],
      cost: 7000,
      rent: 1500
    },
  
    { id: 16,
      name: 'Casino',
      type: 'event',
      position: { x: 1935, y: 1080 },
      next: [
      { from: 15, roll: 'any', to: 17 }
          ]
    },
  
    { id: 17,
      name: 'AK-47',
      type: 'property',
      division: 'weapons',
      position: { x: 1955, y: 900 },
      next: [
      { from: 16, roll: 'any', to: 18 }
          ],
      cost: 10500,
      rent: 3000
    },
  
    { id: 18,
      name: 'Nike',
      type: 'property',
      division: 'sports',
      position: { x: 1955, y: 730 },
      next: [
      { from: 17, roll: 'any', to: 19 }
          ],
      cost: 7000,
      rent: 1500
    },
  
    { id: 19,
      name: 'Stone Paper Scissors',
      type: 'event',
      position: { x: 1955, y: 580 },
      next: [
      { from: 18, roll: 'any', to: 20 }
          ]
    },
  
    { id: 20,
      name: 'Red Barrel',
      type: 'property',
      division: 'gaming',
      position: { x: 1955, y: 425 },
      next: [
      { from: 19, roll: 'above', to: 41 },
      { from: 19, roll: 'below', to: 21 },
      { from: 41, roll: 'any', to: 21 }
          ],
      cost: 5000,
      rent: 1500
    },
  
    { id: 21,
      name: 'Martix Garrix',
      type: 'property',
      division: 'dj',
      position: { x: 1955, y: 265 },
      next: [
      { from: 20, roll: 'any', to: 22 }
          ],
      cost: 6500,
      rent: 2000
    },
  
    { id: 22,
      name: 'Road',
      type: 'event',
      position: { x: 1955, y: 90 },
      next: [
      { from: 21, roll: 'any', to: 23 }
          ]
    },
  
    { id: 23,
      name: 'Bazooka',
      type: 'property',
      division: 'weapons',
      position: { x: 1745, y: 80 },
      next: [
      { from: 22, roll: 'any', to: 24 }
          ],
      cost: 11500,
      rent: 3500
    },
  
    { id: 24,
      name: 'Hasbro',
      type: 'property',
      division: 'gaming',
      position: { x: 1530, y: 80 },
      next: [
      { from: 23, roll: 'any', to: 25 }
          ],
      cost: 8000,
      rent: 3000
    },
  
    { id: 25,
      name: 'KFC',
      type: 'property',
      division: 'food',
      position: { x: 1315, y: 80 },
      next: [
      { from: 24, roll: 'any', to: 26 }
          ],
      cost: 3000,
      rent: 500
    },
  
    { id: 26,
      name: 'Deagle',
      type: 'property',
      division: 'weapons',
      position: { x: 1110, y: 80 },
      next: [
      { from: 25, roll: 'any', to: 27 }
          ],
      cost: 8000,
      rent: 200
    },
  
    { id: 27,
      name: 'Choose corner',
      type: 'event',
      position: { x: 915, y: 80 },
      next: [
      { from: 26, roll: 'above', to: 37 },
      { from: 26, roll: 'below', to: 28 },
      { from: 37, roll: 'any', to: 28 }
          ],
    },
  
    { id: 28,
      name: 'Mcd',
      type: 'property',
      division: 'food',
      position: { x: 705, y: 80 },
      next: [
      { from: 27, roll: 'any', to: 29 }
          ],
      cost: 1500,
      rent: 500
    },
  
  { id: 29,
      name: 'MI',
      type: 'property',
      division: 'tech',
      position: { x: 500, y: 80 },
      next: [
      { from: 28, roll: 'any', to: 30 }
          ],
      cost: 7500,
      rent: 2000
    },
  
  { id: 30,
      name: 'Underarmour',
      type: 'property',
      division: 'sports',
      position: { x: 305, y: 80 },
      next: [
      { from: 29, roll: 'any', to: 1 }
          ],
      cost: 8000,
      rent: 3000
    },
  
  { id: 31,
      name: 'Stone Paper Scissors',
      type: 'event',
      position: { x: 260, y: 860 },
      next: [
      { from: 32, roll: 'any', to: 6 },
      { from: 6, roll: 'any', to: 32 }
          ]
    },
  
  { id: 32,
      name: 'DJ Snake',
      type: 'property',
      division: 'dj',
      position: { x: 470, y: 770 },
      next: [
      { from: 31, roll: 'any', to: 33 },
      { from: 33, roll: 'any', to: 31 }
          ],
      cost: 6500,
      rent: 2500
    },
  
  { id: 33,
      name: 'Epic Games',
      type: 'property',
      division: 'gaming',
      position: { x: 655, y: 700 },
      next: [
      { from: 32, roll: 'any', to: 34 },
      { from: 34, roll: 'any', to: 32 }
          ],
      cost: 9500,
      rent: 3000
    },
  
  { id: 34,
      name: 'Marshmello',
      type: 'property',
      division: 'dj',
      position: { x: 840, y: 630 },
      next: [
      { from: 33, roll: 'any', to: 35 },
      { from: 35, roll: 'any', to: 33 }
          ],
      cost: 6500,
      rent: 2000
    },
  
  { id: 35,
      name: 'Supercell',
      type: 'property',
      division: 'gaming',
      position: { x: 1005, y: 555 },
      next: [
      { from: 34, roll: 'any', to: 36 },
      { from: 36, roll: 'any', to: 34 }
          ],
      cost: 12000,
      rent: 3500
    },
  
    { id: 36,
      name: 'Apple',
      type: 'property',
      division: 'tech',
      position: { x: 1200, y: 480 },
      next: [
      { from: 35, roll: 'any', to: 39 },
      { from: 39, roll: 'any', to: 35 }
          ],
      cost: 15000,
      rent: 5000
    },
  
    { id: 37,
      name: 'Google',
      type: 'property',
      division: 'tech',
      position: { x: 925, y: 250 },
      next: [
      { from: 27, roll: 'any', to: 38 },
      { from: 38, roll: 'any', to: 27 }
          ],
      cost: 15000,
      rent: 5000
    },
  
  { id: 38,
      name: 'Hardwell',
      type: 'property',
      division: 'dj',
      position: { x: 1110, y: 325 },
      next: [
      { from: 37, roll: 'any', to: 39 },
      { from: 39, roll: 'any', to: 37 }
          ],
      cost: 8000,
      rent: 2500
    },
  
  { id: 39,
      name: 'Puma',
      type: 'property',
      division: 'sports',
      position: { x: 1320, y: 350 },
      next: [
      { from: 36, roll: 'above', to: 40 },
      { from: 36, roll: 'below', to: 38 },
      { from: 38, roll: 'above', to: 40 },
      { from: 38, roll: 'below', to: 36 },
      { from: 40, roll: 'above', to: 36 },
      { from: 40, roll: 'below', to: 38 }
          ],
      cost: 6000,
      rent: 2500
    },
  
  { id: 40,
      name: 'Skrillex',
      type: 'property',
      division: 'dj',
      position: { x: 1535, y: 385 },
      next: [
      { from: 41, roll: 'any', to: 39 },
      { from: 39, roll: 'any', to: 41 }
          ],
      cost: 7500,
      rent: 2500
    },
  
    { id: 41,
      name: 'Amazon',
      type: 'property',
      division: 'tech',
      position: { x: 1760, y: 405 },
      next: [
      { from: 20, roll: 'above', to: 40 },
      { from: 20, roll: 'below', to: 42 },
      { from: 42, roll: 'above', to: 40 },
      { from: 42, roll: 'below', to: 20 },
      { from: 40, roll: 'above', to: 42 },
      { from: 40, roll: 'below', to: 20 }
          ],
      cost: 17500,
      rent: 6500
    },
  
    { id: 42,
      name: 'Big Chill',
      type: 'property',
      division: 'food',
      position: { x: 1672, y: 547 },
      next: [
      { from: 41, roll: 'any', to: 43 },
      { from: 43, roll: 'any', to: 41 }
          ],
      cost: 4000,
      rent: 1000
    },
  
    { id: 43,
      name: 'Motorola',
      type: 'property',
      division: 'tech',
      position: { x: 1520, y: 677 },
      next: [
      { from: 42, roll: 'any', to: 44 },
      { from: 44, roll: 'any', to: 42 }
          ],
      cost: 10000,
      rent: 2000
    },
  
    { id: 44,
      name: 'Dominos',
      type: 'property',
      division: 'food',
      position: { x: 1370, y: 800 },
      next: [
      { from: 45, roll: 'any', to: 43 },
      { from: 43, roll: 'any', to: 45 }
          ],
      cost: 3500,
      rent: 500
    },
  
    { id: 45,
      name: 'Tencent',
      type: 'property',
      division: 'gaming',
      position: { x: 1200, y: 945 },
      next: [
      { from: 44, roll: 'any', to: 12 },
      { from: 12, roll: 'any', to: 44 }
          ],
      cost: 9500,
      rent: 3000,
    },
  
  ];;
