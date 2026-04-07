const cinemaBranches = [
  {
    id: 'cinema-hcm-01',
    name: 'JDWoMoviex Cinema Saigon Center',
    address: '65 Le Loi, Ben Nghe Ward, District 1',
    city: 'Ho Chi Minh City',
    features: ['Dolby Atmos', 'Premium Lounge', 'IMAX Ready'],
  },
  {
    id: 'cinema-hn-01',
    name: 'JDWoMoviex Cinema West Lake',
    address: '28 Thanh Nien, Tay Ho District',
    city: 'Hanoi',
    features: ['Couple Seats', 'VIP Balcony', '4K Laser'],
  },
  {
    id: 'cinema-dn-01',
    name: 'JDWoMoviex Cinema Han River',
    address: '12 Bach Dang, Hai Chau District',
    city: 'Da Nang',
    features: ['Family Hall', 'Snack Bar', 'City View'],
  },
];

const cinemaMovies = [
  {
    id: 'mvx-001',
    title: 'Starlight Boulevard',
    genre: 'Drama',
    duration: '128 min',
    rating: 'PG-13',
    poster: '/posters/p1.svg',
    description:
      'A filmmaker returns to her hometown and confronts the story that shaped her first award-winning feature.',
  },
  {
    id: 'mvx-002',
    title: 'Velocity Run',
    genre: 'Action',
    duration: '114 min',
    rating: 'PG-13',
    poster: '/posters/p2.svg',
    description:
      'A high-stakes courier chase turns into a city-wide mystery when a secret package changes hands.',
  },
  {
    id: 'mvx-003',
    title: 'Nightfall Protocol',
    genre: 'Sci-Fi',
    duration: '136 min',
    rating: 'PG-13',
    poster: '/posters/p3.svg',
    description:
      'A lunar outpost faces a blackout, and a quiet engineer becomes the only line between survival and chaos.',
  },
  {
    id: 'mvx-004',
    title: 'Golden Ticket',
    genre: 'Comedy',
    duration: '102 min',
    rating: 'PG',
    poster: '/posters/p4.svg',
    description:
      'Two friends stumble into a VIP gala, forcing them to fake their way through a night of surprises.',
  },
];

const showtimeCatalog = [
  {
    id: 'st-001',
    movieId: 'mvx-001',
    cinemaId: 'cinema-hcm-01',
    auditorium: 'Hall A',
    dayIndex: 0,
    times: ['10:00', '13:20', '18:10'],
    price: 95000,
  },
  {
    id: 'st-002',
    movieId: 'mvx-001',
    cinemaId: 'cinema-hn-01',
    auditorium: 'Hall 3',
    dayIndex: 2,
    times: ['11:10', '15:30', '20:15'],
    price: 105000,
  },
  {
    id: 'st-003',
    movieId: 'mvx-002',
    cinemaId: 'cinema-hcm-01',
    auditorium: 'Hall B',
    dayIndex: 1,
    times: ['12:10', '16:00', '21:20'],
    price: 115000,
  },
  {
    id: 'st-004',
    movieId: 'mvx-002',
    cinemaId: 'cinema-dn-01',
    auditorium: 'Hall 2',
    dayIndex: 3,
    times: ['09:30', '14:40', '19:30'],
    price: 95000,
  },
  {
    id: 'st-005',
    movieId: 'mvx-003',
    cinemaId: 'cinema-hn-01',
    auditorium: 'Hall 1',
    dayIndex: 4,
    times: ['10:50', '17:10', '22:00'],
    price: 125000,
  },
  {
    id: 'st-006',
    movieId: 'mvx-003',
    cinemaId: 'cinema-hcm-01',
    auditorium: 'Hall C',
    dayIndex: 5,
    times: ['09:20', '13:40', '18:30'],
    price: 110000,
  },
  {
    id: 'st-007',
    movieId: 'mvx-004',
    cinemaId: 'cinema-dn-01',
    auditorium: 'Hall 4',
    dayIndex: 6,
    times: ['11:00', '15:10', '20:40'],
    price: 85000,
  },
  {
    id: 'st-008',
    movieId: 'mvx-004',
    cinemaId: 'cinema-hcm-01',
    auditorium: 'Hall D',
    dayIndex: 2,
    times: ['10:30', '14:50', '19:00'],
    price: 90000,
  },
];

const bookingHistory = [
  {
    id: 'bk-001',
    movieId: 'mvx-002',
    cinemaId: 'cinema-hcm-01',
    showtime: '2026-04-10 18:10',
    seats: ['C5', 'C6'],
    total: 230000,
    status: 'Confirmed',
  },
  {
    id: 'bk-002',
    movieId: 'mvx-004',
    cinemaId: 'cinema-dn-01',
    showtime: '2026-04-12 20:40',
    seats: ['D3'],
    total: 85000,
    status: 'Confirmed',
  },
];

export { cinemaBranches, cinemaMovies, showtimeCatalog, bookingHistory };
