import { Logger } from '@nestjs/common';
import { Restaurant } from 'src/restaurants/domain/restaurant.entity';
import { DataSource } from 'typeorm';

export const seedRestaurants = async (
  dataSource: DataSource,
  logger: Logger,
) => {
  const restaurantRepo = dataSource.getRepository(Restaurant);

  const cities = ['Kraków', 'Warszawa', 'Gdańsk', 'Wrocław', 'Poznań'];
  const cuisines = [
    'Sushi',
    'Włoska',
    'Amerykańska',
    'Indyjska',
    'Meksykańska',
    'Polska',
    'Chińska',
  ];
  // Usunęliśmy specyficzne słowa kluczowe, bo Lorem Picsum ich nie używa
  // W przypadku Lorem Picsum, wystarczy sam seed dla powtarzalności
  const genericImageSeeds = ['interior', 'food', 'cafe', 'dining'];

  const generateRandomRestaurant = (index: number) => {
    const city = cities[Math.floor(Math.random() * cities.length)];
    const cuisine = cuisines[Math.floor(Math.random() * cuisines.length)];
    const name = `Restauracja #${index + 1} ${cuisine}`;

    // Używamy nazwy restauracji i dodatkowego słowa jako ziarna dla Lorem Picsum
    // Aby uzyskać "tematyczne" zdjęcia, Lorem Picsum nie oferuje tego łatwo.
    // Możesz tutaj albo użyć generycznego ziarna, albo kombinować z Cuisine + Name.
    // Dla prostoty, użyjemy kombinacji nazwy restauracji i losowego ogólnego słowa kluczowego z listy
    const selectedGenericSeed =
      genericImageSeeds[Math.floor(Math.random() * genericImageSeeds.length)];
    const seed = `${name}-${selectedGenericSeed}`; // Tworzymy unikalne ziarno

    // Zmieniamy na Lorem Picsum z ziarnem
    const image = `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/400`;

    const rating = parseFloat((Math.random() * 5).toFixed(1));

    return {
      name: name,
      city: city,
      address: `ul. Przykładowa ${index + 1}`,
      description: `Opis restauracji ${cuisine} w ${city}.`,
      openHours: {
        monday: ['10:00', '22:00'],
        tuesday: ['10:00', '22:00'],
        wednesday: ['10:00', '22:00'],
        thursday: ['10:00', '22:00'],
        friday: ['10:00', '23:00'],
        saturday: ['11:00', '23:00'],
        sunday: ['11:00', '21:00'],
      },
      rating: rating,
      image: image,
      cuisine: cuisine,
    };
  };

  const sushiZenName = 'Sushi Zen';
  const trattoriaBellaName = 'Trattoria Bella';

  const restaurants = [
    {
      name: sushiZenName,
      city: 'Kraków',
      address: 'ul. Długa 12',
      description: 'Nowoczesna restauracja sushi w centrum Krakowa',
      openHours: {
        monday: ['12:00', '22:00'],
        tuesday: ['12:00', '22:00'],
        wednesday: ['12:00', '22:00'],
        thursday: ['12:00', '22:00'],
        friday: ['12:00', '23:00'],
        saturday: ['12:00', '23:00'],
        sunday: ['12:00', '21:00'],
      },
      rating: 4.5,
      image: `https://picsum.photos/seed/${encodeURIComponent(sushiZenName + '-sushi')}/800/400`,
      cuisine: 'Sushi',
    },
    {
      name: trattoriaBellaName,
      city: 'Warszawa',
      address: 'ul. Mokotowska 7',
      description: 'Rodzinna restauracja włoska z tradycyjnym menu',
      openHours: {
        monday: ['11:00', '22:00'],
        tuesday: ['11:00', '22:00'],
        wednesday: ['11:00', '22:00'],
        thursday: ['11:00', '22:00'],
        friday: ['11:00', '23:00'],
        saturday: ['11:00', '23:00'],
        sunday: ['11:00', '21:00'],
      },
      rating: 4.8,
      image: `https://picsum.photos/seed/${encodeURIComponent(trattoriaBellaName + '-italian')}/800/400`,
      cuisine: 'Włoska',
    },
  ];

  for (let i = 2; i < 20; i++) {
    restaurants.push(generateRandomRestaurant(i));
  }

  await restaurantRepo.save(restaurants);
  logger.log('✅ Seeded restaurants');
};
