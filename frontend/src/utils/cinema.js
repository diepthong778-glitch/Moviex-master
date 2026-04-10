const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SHOWTIME_STORAGE_KEY = 'cinema.showtimes';

export const getWeekDates = (labels = WEEK_DAYS, baseDate = new Date()) => {
  const current = new Date(baseDate);
  const day = current.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  current.setDate(current.getDate() + diff);

  return labels.map((label, index) => {
    const date = new Date(current);
    date.setDate(current.getDate() + index);
    return {
      label,
      date,
      key: index,
      isToday: isSameDay(date, new Date()),
    };
  });
};

export const isSameDay = (dateA, dateB) => {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
};

export const formatShortDate = (date, locale = 'en-US') => {
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
};

export const getTodayWeekIndex = () => {
  const today = new Date();
  const day = today.getDay();
  return day === 0 ? 6 : day - 1;
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
};

const parseDurationMinutes = (durationLabel) => {
  if (!durationLabel) return null;
  const match = String(durationLabel).match(/(\d+)/);
  if (!match) return null;
  const minutes = Number(match[1]);
  return Number.isFinite(minutes) ? minutes : null;
};

const padTime = (value) => String(value).padStart(2, '0');

const addMinutesToTime = (time, minutes) => {
  if (!time || minutes == null) return null;
  const [hourStr, minuteStr] = time.split(':');
  const baseMinutes = Number(hourStr) * 60 + Number(minuteStr);
  const total = baseMinutes + minutes;
  const normalized = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${padTime(hours)}:${padTime(mins)}`;
};

const toIsoDate = (date) => {
  const year = date.getFullYear();
  const month = padTime(date.getMonth() + 1);
  const day = padTime(date.getDate());
  return `${year}-${month}-${day}`;
};

export const expandShowtimeCatalog = (catalog = [], movies = [], weekDates = getWeekDates()) => {
  const movieMap = new Map(movies.map((movie) => [movie.id, movie]));
  return catalog.flatMap((showtime) => {
    const dateMeta = weekDates[showtime.dayIndex];
    const movie = movieMap.get(showtime.movieId);
    const durationMinutes = parseDurationMinutes(movie?.duration);
    const showDate = dateMeta ? dateMeta.date : new Date();
    const showDateIso = toIsoDate(showDate);
    return (showtime.times || []).map((time) => ({
      id: `${showtime.id}-${time.replace(':', '')}`,
      movieId: showtime.movieId,
      cinemaId: showtime.cinemaId,
      auditorium: showtime.auditorium,
      dayIndex: showtime.dayIndex,
      showDate: showDateIso,
      startTime: time,
      endTime: addMinutesToTime(time, durationMinutes),
      price: showtime.price,
    }));
  });
};

export const loadCustomShowtimes = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SHOWTIME_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveCustomShowtimes = (showtimes) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SHOWTIME_STORAGE_KEY, JSON.stringify(showtimes));
};

const buildShowtimeKey = (showtime) => {
  return [
    showtime.movieId,
    showtime.cinemaId,
    showtime.auditorium,
    showtime.showDate,
    showtime.startTime,
  ].join('|');
};

export const mergeShowtimes = (base = [], custom = []) => {
  const merged = new Map();
  [...base, ...custom].forEach((showtime) => {
    merged.set(buildShowtimeKey(showtime), showtime);
  });
  return Array.from(merged.values());
};

export const buildWeeklySchedule = (showtimes, movies, cinemas, weekDates = getWeekDates()) => {
  const movieMap = new Map(movies.map((movie) => [movie.id, movie]));
  const cinemaMap = new Map(cinemas.map((cinema) => [cinema.id, cinema]));

  return weekDates.map((day) => {
    const dayShowtimes = showtimes.filter((showtime) => showtime.dayIndex === day.key);
    const movieGroups = new Map();

    dayShowtimes.forEach((showtime) => {
      if (!movieGroups.has(showtime.movieId)) {
        movieGroups.set(showtime.movieId, []);
      }
      movieGroups.get(showtime.movieId).push(showtime);
    });

    const moviesForDay = Array.from(movieGroups.entries()).map(([movieId, entries]) => {
      const grouped = new Map();
      entries.forEach((entry) => {
        const key = `${entry.cinemaId}-${entry.auditorium}-${entry.price}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            cinema: cinemaMap.get(entry.cinemaId),
            auditorium: entry.auditorium,
            price: entry.price,
            times: [],
          });
        }
        grouped.get(key).times.push(entry.startTime);
      });

      grouped.forEach((group) => {
        group.times = Array.from(new Set(group.times)).sort();
      });

      return {
        movie: movieMap.get(movieId),
        entries: Array.from(grouped.values()),
      };
    });

    return {
      ...day,
      movies: moviesForDay,
    };
  });
};

export const getNowShowingToday = (showtimes, movies, todayIndex) => {
  const movieMap = new Map(movies.map((movie) => [movie.id, movie]));
  const todayShowtimes = showtimes.filter((showtime) => showtime.dayIndex === todayIndex);
  const grouped = new Map();

  todayShowtimes.forEach((showtime) => {
    if (!grouped.has(showtime.movieId)) {
      grouped.set(showtime.movieId, []);
    }
    grouped.get(showtime.movieId).push(showtime);
  });

  return Array.from(grouped.entries()).map(([movieId, entries]) => {
    const sorted = entries.slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
    return {
      movie: movieMap.get(movieId),
      firstShowtime: sorted[0],
    };
  }).filter((item) => item.movie);
};

export const filterShowtimes = (showtimes, filters = {}) => {
  const { movieId, cinemaId, dayIndex, showDate } = filters;
  return showtimes.filter((showtime) => {
    if (movieId && showtime.movieId !== movieId) return false;
    if (cinemaId && showtime.cinemaId !== cinemaId) return false;
    if (dayIndex != null && showtime.dayIndex !== dayIndex) return false;
    if (showDate && showtime.showDate !== showDate) return false;
    return true;
  });
};
