/**
 * Synthetic Bengaluru driver roster for Ola, Uber, and Rapido (10 drivers each = 30 total).
 * Used for realistic hackathon demonstration & simulated dispatch across vehicle types.
 */

export const SYNTHETIC_DRIVERS = {
  Ola: [
    {
      driver_id: 'OLA-DRV-01',
      provider: 'Ola',
      vehicle_type: 'Bike',
      driver_name: 'Karthik Gowda',
      driver_rating: '4.8 ★ (1,420 rides)',
      vehicle_model: 'TVS Apache RTR 160',
      registration_number: 'KA-01-OL-1104',
      zone: 'Indiranagar',
      demo_contact: '+91-80-0000-1101'
    },
    {
      driver_id: 'OLA-DRV-02',
      provider: 'Ola',
      vehicle_type: 'Bike',
      driver_name: 'Raghavendra M.',
      driver_rating: '4.7 ★ (980 rides)',
      vehicle_model: 'Bajaj Pulsar 150',
      registration_number: 'KA-03-OL-1189',
      zone: 'Koramangala',
      demo_contact: '+91-80-0000-1102'
    },
    {
      driver_id: 'OLA-DRV-03',
      provider: 'Ola',
      vehicle_type: 'Auto',
      driver_name: 'Nagaraj R.',
      driver_rating: '4.9 ★ (3,210 rides)',
      vehicle_model: 'Bajaj RE Compact CNG Auto',
      registration_number: 'KA-05-OL-2042',
      zone: 'Jayanagar',
      demo_contact: '+91-80-0000-1103'
    },
    {
      driver_id: 'OLA-DRV-04',
      provider: 'Ola',
      vehicle_type: 'Auto',
      driver_name: 'Basavaraj K.',
      driver_rating: '4.8 ★ (2,640 rides)',
      vehicle_model: 'TVS King Deluxe Auto',
      registration_number: 'KA-01-OL-2190',
      zone: 'MG Road',
      demo_contact: '+91-80-0000-1104'
    },
    {
      driver_id: 'OLA-DRV-05',
      provider: 'Ola',
      vehicle_type: 'Mini',
      driver_name: 'Manjunath S.',
      driver_rating: '4.8 ★ (1,890 rides)',
      vehicle_model: 'Maruti Suzuki WagonR AC',
      registration_number: 'KA-03-OL-3088',
      zone: 'HSR Layout',
      demo_contact: '+91-80-0000-1105'
    },
    {
      driver_id: 'OLA-DRV-06',
      provider: 'Ola',
      vehicle_type: 'Mini',
      driver_name: 'Harish Kumar B.',
      driver_rating: '4.7 ★ (1,340 rides)',
      vehicle_model: 'Tata Tiago EV',
      registration_number: 'KA-04-OL-3215',
      zone: 'Malleshwaram',
      demo_contact: '+91-80-0000-1106'
    },
    {
      driver_id: 'OLA-DRV-07',
      provider: 'Ola',
      vehicle_type: 'Sedan',
      driver_name: 'Pradeep Kumar',
      driver_rating: '4.9 ★ (2,750 rides)',
      vehicle_model: 'Honda Amaze VX AC',
      registration_number: 'KA-04-OL-4099',
      zone: 'Whitefield',
      demo_contact: '+91-80-0000-1107'
    },
    {
      driver_id: 'OLA-DRV-08',
      provider: 'Ola',
      vehicle_type: 'Sedan',
      driver_name: 'Syed Imran',
      driver_rating: '4.8 ★ (2,110 rides)',
      vehicle_model: 'Maruti Suzuki Dzire',
      registration_number: 'KA-02-OL-4312',
      zone: 'Hebbal',
      demo_contact: '+91-80-0000-1108'
    },
    {
      driver_id: 'OLA-DRV-09',
      provider: 'Ola',
      vehicle_type: 'SUV',
      driver_name: 'Suresh Babu',
      driver_rating: '4.9 ★ (3,540 rides)',
      vehicle_model: 'Toyota Innova Crysta',
      registration_number: 'KA-02-OL-6077',
      zone: 'Electronic City',
      demo_contact: '+91-80-0000-1109'
    },
    {
      driver_id: 'OLA-DRV-10',
      provider: 'Ola',
      vehicle_type: 'SUV',
      driver_name: 'Venkatesh P.',
      driver_rating: '4.8 ★ (1,920 rides)',
      vehicle_model: 'Maruti Suzuki Ertiga',
      registration_number: 'KA-05-OL-6294',
      zone: 'Yelahanka',
      demo_contact: '+91-80-0000-1110'
    }
  ],

  Uber: [
    {
      driver_id: 'UBER-DRV-01',
      provider: 'Uber',
      vehicle_type: 'Bike',
      driver_name: 'Arjun Nair',
      driver_rating: '4.9 ★ (1,680 trips)',
      vehicle_model: 'Honda Shine 125',
      registration_number: 'KA-01-UB-1201',
      zone: 'Koramangala',
      demo_contact: '+91-80-0000-2201'
    },
    {
      driver_id: 'UBER-DRV-02',
      provider: 'Uber',
      vehicle_type: 'Bike',
      driver_name: 'Naveen Hegde',
      driver_rating: '4.8 ★ (1,120 trips)',
      vehicle_model: 'Hero Splendor Plus',
      registration_number: 'KA-04-UB-1276',
      zone: 'Indiranagar',
      demo_contact: '+91-80-0000-2202'
    },
    {
      driver_id: 'UBER-DRV-03',
      provider: 'Uber',
      vehicle_type: 'Auto',
      driver_name: 'Mahesh Naik',
      driver_rating: '4.9 ★ (2,980 trips)',
      vehicle_model: 'Piaggio Ape City Auto',
      registration_number: 'KA-05-UB-2314',
      zone: 'MG Road',
      demo_contact: '+91-80-0000-2203'
    },
    {
      driver_id: 'UBER-DRV-04',
      provider: 'Uber',
      vehicle_type: 'Auto',
      driver_name: 'Ravi Shankar T.',
      driver_rating: '4.7 ★ (2,050 trips)',
      vehicle_model: 'Bajaj RE Maxima Auto',
      registration_number: 'KA-02-UB-2409',
      zone: 'Jayanagar',
      demo_contact: '+91-80-0000-2204'
    },
    {
      driver_id: 'UBER-DRV-05',
      provider: 'Uber',
      vehicle_type: 'Mini',
      driver_name: 'Deepak Shetty',
      driver_rating: '4.9 ★ (2,410 trips)',
      vehicle_model: 'Maruti Suzuki Swift AC',
      registration_number: 'KA-03-UB-3318',
      zone: 'Whitefield',
      demo_contact: '+91-80-0000-2205'
    },
    {
      driver_id: 'UBER-DRV-06',
      provider: 'Uber',
      vehicle_type: 'Mini',
      driver_name: 'Kiran Rao',
      driver_rating: '4.8 ★ (1,760 trips)',
      vehicle_model: 'Hyundai Grand i10',
      registration_number: 'KA-01-UB-3490',
      zone: 'HSR Layout',
      demo_contact: '+91-80-0000-2206'
    },
    {
      driver_id: 'UBER-DRV-07',
      provider: 'Uber',
      vehicle_type: 'Sedan',
      driver_name: 'Mohammed Tariq',
      driver_rating: '4.9 ★ (3,120 trips)',
      vehicle_model: 'Hyundai Aura SX',
      registration_number: 'KA-04-UB-4521',
      zone: 'Hebbal',
      demo_contact: '+91-80-0000-2207'
    },
    {
      driver_id: 'UBER-DRV-08',
      provider: 'Uber',
      vehicle_type: 'Sedan',
      driver_name: 'Santhosh Reddy',
      driver_rating: '4.8 ★ (2,290 trips)',
      vehicle_model: 'Tata Tigor XZA',
      registration_number: 'KA-05-UB-4688',
      zone: 'Electronic City',
      demo_contact: '+91-80-0000-2208'
    },
    {
      driver_id: 'UBER-DRV-09',
      provider: 'Uber',
      vehicle_type: 'SUV',
      driver_name: 'Ashok Kulkarni',
      driver_rating: '4.9 ★ (3,890 trips)',
      vehicle_model: 'Toyota Innova Hycross',
      registration_number: 'KA-01-UB-6510',
      zone: 'Yelahanka',
      demo_contact: '+91-80-0000-2209'
    },
    {
      driver_id: 'UBER-DRV-10',
      provider: 'Uber',
      vehicle_type: 'SUV',
      driver_name: 'Prashanth V.',
      driver_rating: '4.8 ★ (2,140 trips)',
      vehicle_model: 'Kia Carens 6-Seater',
      registration_number: 'KA-03-UB-6742',
      zone: 'Malleshwaram',
      demo_contact: '+91-80-0000-2210'
    }
  ],

  Rapido: [
    {
      driver_id: 'RAPIDO-DRV-01',
      provider: 'Rapido',
      vehicle_type: 'Bike',
      driver_name: 'Chethan Gowda',
      driver_rating: '4.9 ★ (2,340 rides)',
      vehicle_model: 'Honda Activa 6G',
      registration_number: 'KA-01-RP-1502',
      zone: 'Indiranagar',
      demo_contact: '+91-80-0000-3301'
    },
    {
      driver_id: 'RAPIDO-DRV-02',
      provider: 'Rapido',
      vehicle_type: 'Bike',
      driver_name: 'Vinay Kumar S.',
      driver_rating: '4.8 ★ (1,910 rides)',
      vehicle_model: 'TVS Jupiter 125',
      registration_number: 'KA-05-RP-1648',
      zone: 'Koramangala',
      demo_contact: '+91-80-0000-3302'
    },
    {
      driver_id: 'RAPIDO-DRV-03',
      provider: 'Rapido',
      vehicle_type: 'Auto',
      driver_name: 'Shivaraj N.',
      driver_rating: '4.9 ★ (2,870 rides)',
      vehicle_model: 'Bajaj RE Auto Rickshaw',
      registration_number: 'KA-03-RP-2509',
      zone: 'HSR Layout',
      demo_contact: '+91-80-0000-3303'
    },
    {
      driver_id: 'RAPIDO-DRV-04',
      provider: 'Rapido',
      vehicle_type: 'Auto',
      driver_name: 'Lokesh Babu',
      driver_rating: '4.8 ★ (2,190 rides)',
      vehicle_model: 'Mahindra Treo Electric Auto',
      registration_number: 'KA-04-RP-2781',
      zone: 'Jayanagar',
      demo_contact: '+91-80-0000-3304'
    },
    {
      driver_id: 'RAPIDO-DRV-05',
      provider: 'Rapido',
      vehicle_type: 'Mini',
      driver_name: 'Darshan P.',
      driver_rating: '4.8 ★ (1,540 rides)',
      vehicle_model: 'Maruti Suzuki Celerio',
      registration_number: 'KA-02-RP-3604',
      zone: 'MG Road',
      demo_contact: '+91-80-0000-3305'
    },
    {
      driver_id: 'RAPIDO-DRV-06',
      provider: 'Rapido',
      vehicle_type: 'Mini',
      driver_name: 'Yogesh Acharya',
      driver_rating: '4.7 ★ (1,210 rides)',
      vehicle_model: 'Renault Kwid Climber',
      registration_number: 'KA-01-RP-3792',
      zone: 'Malleshwaram',
      demo_contact: '+91-80-0000-3306'
    },
    {
      driver_id: 'RAPIDO-DRV-07',
      provider: 'Rapido',
      vehicle_type: 'Sedan',
      driver_name: 'Farhan Pasha',
      driver_rating: '4.9 ★ (2,080 rides)',
      vehicle_model: 'Maruti Suzuki Ciaz',
      registration_number: 'KA-03-RP-4810',
      zone: 'Whitefield',
      demo_contact: '+91-80-0000-3307'
    },
    {
      driver_id: 'RAPIDO-DRV-08',
      provider: 'Rapido',
      vehicle_type: 'Sedan',
      driver_name: 'Girish Bhat',
      driver_rating: '4.8 ★ (1,670 rides)',
      vehicle_model: 'Honda City V AC',
      registration_number: 'KA-05-RP-4935',
      zone: 'Electronic City',
      demo_contact: '+91-80-0000-3308'
    },
    {
      driver_id: 'RAPIDO-DRV-09',
      provider: 'Rapido',
      vehicle_type: 'SUV',
      driver_name: 'Ravikumar D.',
      driver_rating: '4.9 ★ (2,460 rides)',
      vehicle_model: 'Mahindra Marazzo',
      registration_number: 'KA-04-RP-6801',
      zone: 'Hebbal',
      demo_contact: '+91-80-0000-3309'
    },
    {
      driver_id: 'RAPIDO-DRV-10',
      provider: 'Rapido',
      vehicle_type: 'SUV',
      driver_name: 'Sathish Chandra',
      driver_rating: '4.8 ★ (1,830 rides)',
      vehicle_model: 'Maruti Suzuki XL6',
      registration_number: 'KA-02-RP-6944',
      zone: 'Yelahanka',
      demo_contact: '+91-80-0000-3310'
    }
  ]
};

export function getSyntheticDrivers({ provider = null, vehicleType = null } = {}) {
  let pool = [];
  if (provider) {
    const key = Object.keys(SYNTHETIC_DRIVERS).find(
      (k) => k.toLowerCase() === String(provider).trim().toLowerCase()
    );
    pool = key ? SYNTHETIC_DRIVERS[key] : Object.values(SYNTHETIC_DRIVERS).flat();
  } else {
    pool = Object.values(SYNTHETIC_DRIVERS).flat();
  }

  if (vehicleType) {
    const vtMatches = pool.filter(
      (d) => d.vehicle_type.toLowerCase() === String(vehicleType).trim().toLowerCase()
    );
    if (vtMatches.length > 0) return vtMatches;
  }

  return pool;
}
