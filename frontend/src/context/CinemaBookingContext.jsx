import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const BOOKING_STORAGE_KEY = 'moviex.cinema.booking';

const DEFAULT_BOOKING_STATE = {
  showtime: null,
  seatIds: [],
  seatLabels: [],
  pricingBreakdown: null,
  checkoutSession: null,
};

const CinemaBookingContext = createContext(null);

const parseBookingState = (value) => {
  if (!value || typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      ...DEFAULT_BOOKING_STATE,
      ...parsed,
      seatIds: Array.isArray(parsed.seatIds) ? parsed.seatIds : [],
      seatLabels: Array.isArray(parsed.seatLabels) ? parsed.seatLabels : [],
    };
  } catch {
    return null;
  }
};

export function CinemaBookingProvider({ children }) {
  const [bookingState, setBookingState] = useState(DEFAULT_BOOKING_STATE);

  useEffect(() => {
    const stored = parseBookingState(sessionStorage.getItem(BOOKING_STORAGE_KEY));
    if (stored) {
      setBookingState(stored);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(bookingState));
  }, [bookingState]);

  const resetBooking = useCallback(() => {
    setBookingState(DEFAULT_BOOKING_STATE);
  }, []);

  const setSelectedShowtime = useCallback((showtime) => {
    setBookingState((current) => {
      if (!showtime) {
        return DEFAULT_BOOKING_STATE;
      }

      if (current.showtime?.id === showtime.id) {
        return {
          ...current,
          showtime,
        };
      }

      return {
        showtime,
        seatIds: [],
        seatLabels: [],
        pricingBreakdown: null,
        checkoutSession: null,
      };
    });
  }, []);

  const setSeatSelection = useCallback(({ seatIds, seatLabels, pricingBreakdown }) => {
    setBookingState((current) => {
      const nextSeatIds = Array.isArray(seatIds) ? seatIds : [];
      const currentSeatKey = current.seatIds.join('|');
      const nextSeatKey = nextSeatIds.join('|');

      return {
        ...current,
        seatIds: nextSeatIds,
        seatLabels: Array.isArray(seatLabels) ? seatLabels : [],
        pricingBreakdown: pricingBreakdown || null,
        checkoutSession: currentSeatKey === nextSeatKey ? current.checkoutSession : null,
      };
    });
  }, []);

  const clearSeatSelection = useCallback(() => {
    setBookingState((current) => ({
      ...current,
      seatIds: [],
      seatLabels: [],
      pricingBreakdown: null,
      checkoutSession: null,
    }));
  }, []);

  const setCheckoutSession = useCallback((checkoutSession) => {
    setBookingState((current) => {
      const nextCheckoutSession = checkoutSession || null;
      const currentSnapshot = JSON.stringify(current.checkoutSession || null);
      const nextSnapshot = JSON.stringify(nextCheckoutSession);
      if (currentSnapshot === nextSnapshot) {
        return current;
      }

      return {
        ...current,
        checkoutSession: nextCheckoutSession,
      };
    });
  }, []);

  const clearCheckoutSession = useCallback(() => {
    setBookingState((current) => ({
      ...current,
      checkoutSession: null,
    }));
  }, []);

  const value = useMemo(() => ({
    ...bookingState,
    setSelectedShowtime,
    setSeatSelection,
    clearSeatSelection,
    setCheckoutSession,
    clearCheckoutSession,
    resetBooking,
  }), [
    bookingState,
    setSelectedShowtime,
    setSeatSelection,
    clearSeatSelection,
    setCheckoutSession,
    clearCheckoutSession,
    resetBooking,
  ]);

  return (
    <CinemaBookingContext.Provider value={value}>
      {children}
    </CinemaBookingContext.Provider>
  );
}

export const useCinemaBooking = () => {
  const context = useContext(CinemaBookingContext);
  if (!context) {
    throw new Error('useCinemaBooking must be used within CinemaBookingProvider');
  }
  return context;
};
