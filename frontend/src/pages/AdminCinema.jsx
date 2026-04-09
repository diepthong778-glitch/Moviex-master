import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'branches', label: 'Branches' },
  { key: 'auditoriums', label: 'Auditoriums' },
  { key: 'seats', label: 'Seats' },
  { key: 'showtimes', label: 'Showtimes' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'tickets', label: 'Tickets' },
  { key: 'users', label: 'Users' },
  { key: 'payments', label: 'Payments' },
];

const BOOKING_STATUS_OPTIONS = ['PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED'];
const PAYMENT_STATUS_OPTIONS = ['PENDING', 'PAID', 'FAILED', 'CANCELLED'];

const initialBranch = { name: '', address: '', city: '', active: true };
const initialAuditorium = { cinemaId: '', name: '', capacity: 96, active: true };
const initialShowtime = { movieId: '', cinemaId: '', auditoriumId: '', showDate: '', startTime: '', endTime: '', basePrice: 0 };
const initialSeatLayout = { auditoriumId: '', rows: 'ABCDEFGH', seatsPerRow: 12, vipRows: 'CD', coupleRows: 'GH' };
const initialFilters = { movieId: '', cinemaId: '', showDate: '', bookingStatus: '', paymentStatus: '' };

const datePart = (v) => (v ? String(v).slice(0, 10) : '-');
const timePart = (v) => (v ? String(v).slice(0, 5) : '--:--');
const amountText = (v) => `${Number(v || 0).toLocaleString('vi-VN')} VND`;

function AdminCinema() {
  const [tab, setTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [stats, setStats] = useState({});
  const [reference, setReference] = useState({ movies: [], cinemas: [], auditoriums: [] });
  const [branches, setBranches] = useState([]);
  const [auditoriums, setAuditoriums] = useState([]);
  const [seats, setSeats] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);

  const [filters, setFilters] = useState(initialFilters);

  const [branchForm, setBranchForm] = useState(initialBranch);
  const [auditoriumForm, setAuditoriumForm] = useState(initialAuditorium);
  const [showtimeForm, setShowtimeForm] = useState(initialShowtime);
  const [seatLayoutForm, setSeatLayoutForm] = useState(initialSeatLayout);

  const [editBranchId, setEditBranchId] = useState(null);
  const [editAuditoriumId, setEditAuditoriumId] = useState(null);
  const [editShowtimeId, setEditShowtimeId] = useState(null);

  const [seatInspection, setSeatInspection] = useState(null);
  const [seatInspectionLoading, setSeatInspectionLoading] = useState(false);
  const [seatInspectionError, setSeatInspectionError] = useState('');

  const cinemaName = useMemo(() => {
    const map = new Map();
    (reference.cinemas || []).forEach((c) => map.set(c.id, c.name));
    return map;
  }, [reference.cinemas]);

  const movieTitle = useMemo(() => {
    const map = new Map();
    (reference.movies || []).forEach((m) => map.set(m.id, m.title));
    return map;
  }, [reference.movies]);

  const auditoriumName = useMemo(() => {
    const map = new Map();
    (reference.auditoriums || []).forEach((a) => map.set(a.id, a.name));
    return map;
  }, [reference.auditoriums]);

  const runTask = async (fn) => {
    setLoading(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e?.response?.data?.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const notify = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 1800);
  };

  const loadStats = async () => {
    const res = await axios.get('/api/admin/cinema/stats');
    setStats(res.data || {});
  };

  const loadReference = async () => {
    const res = await axios.get('/api/admin/cinema/reference');
    setReference({
      movies: Array.isArray(res.data?.movies) ? res.data.movies : [],
      cinemas: Array.isArray(res.data?.cinemas) ? res.data.cinemas : [],
      auditoriums: Array.isArray(res.data?.auditoriums) ? res.data.auditoriums : [],
    });
  };

  const withCommonFilterParams = (base = {}) => ({
    ...base,
    movieId: filters.movieId || undefined,
    cinemaId: filters.cinemaId || undefined,
    showDate: filters.showDate || undefined,
    bookingStatus: filters.bookingStatus || undefined,
    paymentStatus: filters.paymentStatus || undefined,
  });

  const loadByTab = async () => {
    if (tab === 'dashboard') return loadStats();
    if (tab === 'branches') return setBranches((await axios.get('/api/admin/cinema/branches')).data || []);
    if (tab === 'auditoriums') return setAuditoriums((await axios.get('/api/admin/cinema/auditoriums')).data || []);
    if (tab === 'seats') {
      const params = seatLayoutForm.auditoriumId ? { auditoriumId: seatLayoutForm.auditoriumId } : {};
      return setSeats((await axios.get('/api/admin/cinema/seats', { params })).data || []);
    }
    if (tab === 'showtimes') {
      const params = { cinemaId: filters.cinemaId || undefined, movieId: filters.movieId || undefined, showDate: filters.showDate || undefined };
      return setShowtimes((await axios.get('/api/admin/cinema/showtimes', { params })).data || []);
    }
    if (tab === 'bookings') return setBookings((await axios.get('/api/admin/cinema/bookings', { params: withCommonFilterParams({ limit: 200 }) })).data || []);
    if (tab === 'tickets') return setTickets((await axios.get('/api/admin/cinema/tickets', { params: withCommonFilterParams({ limit: 500 }) })).data || []);
    if (tab === 'users') return setUsers((await axios.get('/api/admin/cinema/users')).data || []);
    if (tab === 'payments') {
      const params = { limit: 200, movieId: filters.movieId || undefined, cinemaId: filters.cinemaId || undefined, showDate: filters.showDate || undefined, paymentStatus: filters.paymentStatus || undefined };
      return setPayments((await axios.get('/api/admin/cinema/payments', { params })).data || []);
    }
  };

  useEffect(() => { runTask(async () => { await Promise.all([loadStats(), loadReference()]); }); }, []);
  useEffect(() => { runTask(loadByTab); }, [tab, seatLayoutForm.auditoriumId, filters.movieId, filters.cinemaId, filters.showDate, filters.bookingStatus, filters.paymentStatus]);

  const saveBranch = async (event) => {
    event.preventDefault();
    await runTask(async () => {
      if (editBranchId) await axios.put(`/api/admin/cinema/branches/${editBranchId}`, branchForm);
      else await axios.post('/api/admin/cinema/branches', branchForm);
      setBranchForm(initialBranch); setEditBranchId(null);
      await Promise.all([loadStats(), loadReference(), loadByTab()]);
      notify('Branch saved');
    });
  };

  const toggleBranch = async (branchId, active) => runTask(async () => {
    await axios.patch(`/api/admin/cinema/branches/${branchId}/active`, null, { params: { active } });
    await Promise.all([loadStats(), loadReference(), loadByTab()]);
    notify(`Branch ${active ? 'activated' : 'deactivated'}`);
  });

  const deleteBranch = async (branchId) => {
    if (!window.confirm('Delete this branch?')) return;
    await runTask(async () => {
      await axios.delete(`/api/admin/cinema/branches/${branchId}`);
      await Promise.all([loadStats(), loadReference(), loadByTab()]);
      notify('Branch deleted');
    });
  };

  const saveAuditorium = async (event) => {
    event.preventDefault();
    await runTask(async () => {
      const payload = { ...auditoriumForm, capacity: Number(auditoriumForm.capacity) };
      if (editAuditoriumId) await axios.put(`/api/admin/cinema/auditoriums/${editAuditoriumId}`, payload);
      else await axios.post('/api/admin/cinema/auditoriums', payload);
      setAuditoriumForm(initialAuditorium); setEditAuditoriumId(null);
      await Promise.all([loadStats(), loadReference(), loadByTab()]);
      notify('Auditorium saved');
    });
  };

  const toggleAuditorium = async (auditoriumId, active) => runTask(async () => {
    await axios.patch(`/api/admin/cinema/auditoriums/${auditoriumId}/active`, null, { params: { active } });
    await Promise.all([loadStats(), loadReference(), loadByTab()]);
    notify(`Auditorium ${active ? 'activated' : 'deactivated'}`);
  });

  const deleteAuditorium = async (auditoriumId) => {
    if (!window.confirm('Delete this auditorium?')) return;
    await runTask(async () => {
      await axios.delete(`/api/admin/cinema/auditoriums/${auditoriumId}`);
      await Promise.all([loadStats(), loadReference(), loadByTab()]);
      notify('Auditorium deleted');
    });
  };

  const generateSeatLayout = async (event) => {
    event.preventDefault();
    if (!seatLayoutForm.auditoriumId) return setError('Please choose an auditorium first');
    await runTask(async () => {
      await axios.post(`/api/admin/cinema/auditoriums/${seatLayoutForm.auditoriumId}/layout`, { ...seatLayoutForm, seatsPerRow: Number(seatLayoutForm.seatsPerRow) });
      await Promise.all([loadStats(), loadByTab()]);
      notify('Seat layout generated');
    });
  };

  const updateSeatStatus = async (seatId, status) => runTask(async () => {
    await axios.put(`/api/admin/cinema/seats/${seatId}`, { status });
    await Promise.all([loadStats(), loadByTab()]);
    notify(`Seat updated: ${status}`);
  });

  const deleteSeat = async (seatId) => {
    if (!window.confirm('Delete this seat?')) return;
    await runTask(async () => {
      await axios.delete(`/api/admin/cinema/seats/${seatId}`);
      await Promise.all([loadStats(), loadByTab()]);
      notify('Seat deleted');
    });
  };

  const saveShowtime = async (event) => {
    event.preventDefault();
    await runTask(async () => {
      const payload = { ...showtimeForm, basePrice: Number(showtimeForm.basePrice) };
      if (editShowtimeId) await axios.put(`/api/admin/cinema/showtimes/${editShowtimeId}`, payload);
      else await axios.post('/api/admin/cinema/showtimes', payload);
      setShowtimeForm(initialShowtime); setEditShowtimeId(null);
      await Promise.all([loadStats(), loadByTab()]);
      notify('Showtime saved');
    });
  };

  const toggleShowtime = async (showtimeId, active) => runTask(async () => {
    await axios.patch(`/api/admin/cinema/showtimes/${showtimeId}/active`, null, { params: { active } });
    await Promise.all([loadStats(), loadByTab()]);
    notify(`Showtime ${active ? 'activated' : 'cancelled'}`);
  });

  const deleteShowtime = async (showtimeId) => {
    if (!window.confirm('Delete this showtime?')) return;
    await runTask(async () => {
      await axios.delete(`/api/admin/cinema/showtimes/${showtimeId}`);
      await Promise.all([loadStats(), loadByTab()]);
      notify('Showtime deleted');
    });
  };

  const inspectShowtimeSeats = async (showtimeId) => {
    setSeatInspectionLoading(true); setSeatInspectionError('');
    try { setSeatInspection((await axios.get(`/api/admin/cinema/showtimes/${showtimeId}/seats`)).data || null); }
    catch (e) { setSeatInspectionError(e?.response?.data?.message || 'Unable to inspect showtime seats'); setSeatInspection(null); }
    finally { setSeatInspectionLoading(false); }
  };

  const updateBookingStatus = async (bookingId, bookingStatus) => runTask(async () => {
    await axios.patch(`/api/admin/cinema/bookings/${bookingId}/status`, { bookingStatus });
    await Promise.all([loadStats(), loadByTab()]);
    notify(`Booking ${bookingStatus}`);
  });

  const simulatePayment = async (txnCode, success) => runTask(async () => {
    await axios.post(`/api/admin/cinema/payments/${txnCode}/simulate`, null, { params: { success } });
    await Promise.all([loadStats(), loadByTab()]);
    notify(`Payment ${success ? 'success' : 'failure'} simulated`);
  });

  const clearFilters = () => setFilters(initialFilters);
  const shouldShowFilterBar = ['showtimes', 'bookings', 'tickets', 'payments'].includes(tab);
  const shouldShowBookingStatusFilter = ['bookings', 'tickets'].includes(tab);
  const shouldShowPaymentStatusFilter = ['bookings', 'tickets', 'payments'].includes(tab);

  const filteredAuditoriumOptions = useMemo(() => {
    if (!showtimeForm.cinemaId) return reference.auditoriums;
    return reference.auditoriums.filter((a) => a.cinemaId === showtimeForm.cinemaId);
  }, [reference.auditoriums, showtimeForm.cinemaId]);

  return (
    <div className="page-shell admin-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">JDWoMoviex Cinema Admin</h1>
          <p className="page-subtitle">Cinema branch, auditorium, seat, showtime, booking, ticket, user and payment operations</p>
        </div>
      </div>

      <section className="account-panel">
        <div className="admin-form-actions" style={{ flexWrap: 'wrap' }}>
          {TABS.map((item) => (
            <button key={item.key} type="button" className={`btn ${tab === item.key ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setTab(item.key); setSeatInspection(null); setSeatInspectionError(''); }}>
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {shouldShowFilterBar && (
        <section className="account-panel">
          <div className="panel-header"><h2 className="panel-title">Filters</h2></div>
          <div className="admin-form-grid">
            <select className="field-control" value={filters.movieId} onChange={(e) => setFilters((s) => ({ ...s, movieId: e.target.value }))}>
              <option value="">All movies</option>
              {reference.movies.map((movie) => (<option key={movie.id} value={movie.id}>{movie.title}</option>))}
            </select>
            <select className="field-control" value={filters.cinemaId} onChange={(e) => setFilters((s) => ({ ...s, cinemaId: e.target.value }))}>
              <option value="">All cinemas</option>
              {reference.cinemas.map((cinema) => (<option key={cinema.id} value={cinema.id}>{cinema.name}</option>))}
            </select>
            <input className="field-control" type="date" value={filters.showDate} onChange={(e) => setFilters((s) => ({ ...s, showDate: e.target.value }))} />
            {shouldShowBookingStatusFilter ? (
              <select className="field-control" value={filters.bookingStatus} onChange={(e) => setFilters((s) => ({ ...s, bookingStatus: e.target.value }))}>
                <option value="">All booking statuses</option>
                {BOOKING_STATUS_OPTIONS.map((status) => (<option key={status} value={status}>{status}</option>))}
              </select>
            ) : <div />}
            {shouldShowPaymentStatusFilter && (
              <select className="field-control" value={filters.paymentStatus} onChange={(e) => setFilters((s) => ({ ...s, paymentStatus: e.target.value }))}>
                <option value="">All payment statuses</option>
                {PAYMENT_STATUS_OPTIONS.map((status) => (<option key={status} value={status}>{status}</option>))}
              </select>
            )}
            <div className="admin-form-actions admin-form-wide"><button type="button" className="btn btn-outline" onClick={clearFilters}>Clear Filters</button></div>
          </div>
        </section>
      )}

      {loading && <p className="muted-text">Loading...</p>}
      {error && <p className="error-text">{error}</p>}
      {notice && <p className="muted-text">{notice}</p>}

      {tab === 'dashboard' && (
        <section className="admin-stats">
          <article className="admin-stat-card"><span className="admin-stat-label">Branches</span><strong className="admin-stat-value">{stats.cinemaBranches || 0}</strong></article>
          <article className="admin-stat-card"><span className="admin-stat-label">Auditoriums</span><strong className="admin-stat-value">{stats.auditoriums || 0}</strong></article>
          <article className="admin-stat-card"><span className="admin-stat-label">Seats</span><strong className="admin-stat-value">{stats.seats || 0}</strong></article>
          <article className="admin-stat-card"><span className="admin-stat-label">Showtimes</span><strong className="admin-stat-value">{stats.showtimes || 0}</strong></article>
          <article className="admin-stat-card"><span className="admin-stat-label">Bookings</span><strong className="admin-stat-value">{stats.bookingsTotal || 0}</strong></article>
          <article className="admin-stat-card"><span className="admin-stat-label">Tickets</span><strong className="admin-stat-value">{stats.ticketsTotal || 0}</strong></article>
          <article className="admin-stat-card"><span className="admin-stat-label">Payments</span><strong className="admin-stat-value">{stats.paymentsTotal || 0}</strong></article>
          <article className="admin-stat-card"><span className="admin-stat-label">Users</span><strong className="admin-stat-value">{stats.usersTotal || 0}</strong></article>
        </section>
      )}

      {tab === 'branches' && (
        <>
          <section className="account-panel">
            <div className="panel-header"><h2 className="panel-title">{editBranchId ? 'Edit Branch' : 'Create Branch'}</h2></div>
            <form className="admin-form-grid" onSubmit={saveBranch}>
              <input className="field-control" value={branchForm.name} placeholder="Branch name" onChange={(e) => setBranchForm((s) => ({ ...s, name: e.target.value }))} required />
              <input className="field-control" value={branchForm.city} placeholder="City" onChange={(e) => setBranchForm((s) => ({ ...s, city: e.target.value }))} required />
              <input className="field-control admin-form-wide" value={branchForm.address} placeholder="Address" onChange={(e) => setBranchForm((s) => ({ ...s, address: e.target.value }))} required />
              <div className="admin-form-actions admin-form-wide">
                <button type="submit" className="btn btn-primary">{editBranchId ? 'Update' : 'Create'}</button>
                {editBranchId && <button type="button" className="btn btn-outline" onClick={() => { setEditBranchId(null); setBranchForm(initialBranch); }}>Cancel</button>}
              </div>
            </form>
          </section>
          <section className="account-panel admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Name</th><th>City</th><th>Address</th><th>Active</th><th>Actions</th></tr></thead>
              <tbody>
                {branches.map((branch) => (
                  <tr key={branch.id}>
                    <td>{branch.name}</td><td>{branch.city}</td><td>{branch.address}</td><td>{branch.active ? 'Yes' : 'No'}</td>
                    <td><div className="admin-actions">
                      <button className="btn btn-outline" onClick={() => { setEditBranchId(branch.id); setBranchForm({ name: branch.name || '', city: branch.city || '', address: branch.address || '', active: !!branch.active }); }}>Edit</button>
                      <button className="btn btn-outline" onClick={() => toggleBranch(branch.id, !branch.active)}>{branch.active ? 'Deactivate' : 'Activate'}</button>
                      <button className="btn btn-primary" onClick={() => deleteBranch(branch.id)}>Delete</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      {tab === 'auditoriums' && (
        <>
          <section className="account-panel">
            <div className="panel-header"><h2 className="panel-title">{editAuditoriumId ? 'Edit Auditorium' : 'Create Auditorium'}</h2></div>
            <form className="admin-form-grid" onSubmit={saveAuditorium}>
              <select className="field-control" value={auditoriumForm.cinemaId} onChange={(e) => setAuditoriumForm((s) => ({ ...s, cinemaId: e.target.value }))} required>
                <option value="">Select cinema</option>
                {reference.cinemas.map((cinema) => <option key={cinema.id} value={cinema.id}>{cinema.name}</option>)}
              </select>
              <input className="field-control" value={auditoriumForm.name} placeholder="Auditorium name" onChange={(e) => setAuditoriumForm((s) => ({ ...s, name: e.target.value }))} required />
              <input className="field-control" type="number" min="1" value={auditoriumForm.capacity} placeholder="Capacity" onChange={(e) => setAuditoriumForm((s) => ({ ...s, capacity: e.target.value }))} required />
              <div className="admin-form-actions admin-form-wide">
                <button type="submit" className="btn btn-primary">{editAuditoriumId ? 'Update' : 'Create'}</button>
                {editAuditoriumId && <button type="button" className="btn btn-outline" onClick={() => { setEditAuditoriumId(null); setAuditoriumForm(initialAuditorium); }}>Cancel</button>}
              </div>
            </form>
          </section>
          <section className="account-panel admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Name</th><th>Cinema</th><th>Capacity</th><th>Active</th><th>Actions</th></tr></thead>
              <tbody>
                {auditoriums.map((auditorium) => (
                  <tr key={auditorium.id}>
                    <td>{auditorium.name}</td><td>{cinemaName.get(auditorium.cinemaId) || auditorium.cinemaId}</td><td>{auditorium.capacity}</td><td>{auditorium.active ? 'Yes' : 'No'}</td>
                    <td><div className="admin-actions">
                      <button className="btn btn-outline" onClick={() => { setEditAuditoriumId(auditorium.id); setAuditoriumForm({ cinemaId: auditorium.cinemaId || '', name: auditorium.name || '', capacity: auditorium.capacity || 0, active: !!auditorium.active }); }}>Edit</button>
                      <button className="btn btn-outline" onClick={() => toggleAuditorium(auditorium.id, !auditorium.active)}>{auditorium.active ? 'Deactivate' : 'Activate'}</button>
                      <button className="btn btn-primary" onClick={() => deleteAuditorium(auditorium.id)}>Delete</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      {tab === 'seats' && (
        <>
          <section className="account-panel">
            <div className="panel-header"><h2 className="panel-title">Generate Seat Layout</h2></div>
            <form className="admin-form-grid" onSubmit={generateSeatLayout}>
              <select className="field-control" value={seatLayoutForm.auditoriumId} onChange={(e) => setSeatLayoutForm((s) => ({ ...s, auditoriumId: e.target.value }))} required>
                <option value="">Select auditorium</option>
                {reference.auditoriums.map((a) => <option key={a.id} value={a.id}>{a.name} ({cinemaName.get(a.cinemaId) || a.cinemaId})</option>)}
              </select>
              <input className="field-control" value={seatLayoutForm.rows} onChange={(e) => setSeatLayoutForm((s) => ({ ...s, rows: e.target.value }))} placeholder="Rows" />
              <input className="field-control" type="number" min="1" value={seatLayoutForm.seatsPerRow} onChange={(e) => setSeatLayoutForm((s) => ({ ...s, seatsPerRow: e.target.value }))} placeholder="Seats/row" />
              <input className="field-control" value={seatLayoutForm.vipRows} onChange={(e) => setSeatLayoutForm((s) => ({ ...s, vipRows: e.target.value }))} placeholder="VIP rows" />
              <input className="field-control" value={seatLayoutForm.coupleRows} onChange={(e) => setSeatLayoutForm((s) => ({ ...s, coupleRows: e.target.value }))} placeholder="Couple rows" />
              <div className="admin-form-actions admin-form-wide"><button type="submit" className="btn btn-primary">Generate</button></div>
            </form>
          </section>
          <section className="account-panel admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Seat</th><th>Type</th><th>Status</th><th>Auditorium</th><th>Actions</th></tr></thead>
              <tbody>
                {seats.map((seat) => (
                  <tr key={seat.id}>
                    <td>{seat.row}{seat.number}</td><td>{seat.type}</td><td>{seat.status}</td><td>{auditoriumName.get(seat.auditoriumId) || seat.auditoriumId}</td>
                    <td><div className="admin-actions">
                      <button className="btn btn-outline" onClick={() => updateSeatStatus(seat.id, seat.status === 'OUT_OF_SERVICE' ? 'AVAILABLE' : 'OUT_OF_SERVICE')}>{seat.status === 'OUT_OF_SERVICE' ? 'Activate' : 'Deactivate'}</button>
                      <button className="btn btn-primary" onClick={() => deleteSeat(seat.id)}>Delete</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
      {tab === 'showtimes' && (
        <>
          <section className="account-panel">
            <div className="panel-header"><h2 className="panel-title">{editShowtimeId ? 'Edit Showtime' : 'Create Showtime'}</h2></div>
            <form className="admin-form-grid" onSubmit={saveShowtime}>
              <select className="field-control" value={showtimeForm.movieId} onChange={(e) => setShowtimeForm((s) => ({ ...s, movieId: e.target.value }))} required>
                <option value="">Select movie</option>
                {reference.movies.map((movie) => <option key={movie.id} value={movie.id}>{movie.title}</option>)}
              </select>
              <select className="field-control" value={showtimeForm.cinemaId} onChange={(e) => setShowtimeForm((s) => ({ ...s, cinemaId: e.target.value, auditoriumId: '' }))} required>
                <option value="">Select cinema</option>
                {reference.cinemas.map((cinema) => <option key={cinema.id} value={cinema.id}>{cinema.name}</option>)}
              </select>
              <select className="field-control" value={showtimeForm.auditoriumId} onChange={(e) => setShowtimeForm((s) => ({ ...s, auditoriumId: e.target.value }))} required>
                <option value="">Select auditorium</option>
                {filteredAuditoriumOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <input className="field-control" type="date" value={showtimeForm.showDate} onChange={(e) => setShowtimeForm((s) => ({ ...s, showDate: e.target.value }))} required />
              <input className="field-control" type="time" value={showtimeForm.startTime} onChange={(e) => setShowtimeForm((s) => ({ ...s, startTime: e.target.value }))} required />
              <input className="field-control" type="time" value={showtimeForm.endTime} onChange={(e) => setShowtimeForm((s) => ({ ...s, endTime: e.target.value }))} required />
              <input className="field-control" type="number" min="0" value={showtimeForm.basePrice} onChange={(e) => setShowtimeForm((s) => ({ ...s, basePrice: e.target.value }))} required />
              <div className="admin-form-actions admin-form-wide">
                <button className="btn btn-primary" type="submit">{editShowtimeId ? 'Update' : 'Create'}</button>
                {editShowtimeId && <button className="btn btn-outline" type="button" onClick={() => { setEditShowtimeId(null); setShowtimeForm(initialShowtime); }}>Cancel</button>}
              </div>
            </form>
          </section>
          <section className="account-panel admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Movie</th><th>Cinema</th><th>Auditorium</th><th>Date</th><th>Time</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {showtimes.map((showtime) => (
                  <tr key={showtime.id}>
                    <td>{movieTitle.get(showtime.movieId) || showtime.movieId}</td>
                    <td>{cinemaName.get(showtime.cinemaId) || showtime.cinemaId}</td>
                    <td>{auditoriumName.get(showtime.auditoriumId) || showtime.auditoriumId}</td>
                    <td>{datePart(showtime.showDate)}</td><td>{timePart(showtime.startTime)} - {timePart(showtime.endTime)}</td><td>{showtime.status}</td>
                    <td><div className="admin-actions">
                      <button className="btn btn-outline" onClick={() => { setEditShowtimeId(showtime.id); setShowtimeForm({ movieId: showtime.movieId || '', cinemaId: showtime.cinemaId || '', auditoriumId: showtime.auditoriumId || '', showDate: datePart(showtime.showDate), startTime: timePart(showtime.startTime), endTime: timePart(showtime.endTime), basePrice: showtime.basePrice || 0 }); }}>Edit</button>
                      <button className="btn btn-outline" onClick={() => inspectShowtimeSeats(showtime.id)}>Inspect Seats</button>
                      <button className="btn btn-primary" onClick={() => toggleShowtime(showtime.id, showtime.status !== 'SCHEDULED')}>{showtime.status === 'SCHEDULED' ? 'Cancel' : 'Activate'}</button>
                      <button className="btn btn-primary" onClick={() => deleteShowtime(showtime.id)}>Delete</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          {(seatInspectionLoading || seatInspectionError || seatInspection) && (
            <section className="account-panel admin-table-wrap">
              <div className="panel-header"><h2 className="panel-title">Showtime Seat Inspection</h2></div>
              {seatInspectionLoading && <p className="muted-text">Loading seat inspection...</p>}
              {seatInspectionError && <p className="error-text">{seatInspectionError}</p>}
              {seatInspection && !seatInspectionLoading && (
                <>
                  <p className="muted-text" style={{ marginBottom: '12px' }}>{seatInspection.movieTitle || '-'} | {seatInspection.cinemaName || '-'} | {seatInspection.auditoriumName || '-'} | {datePart(seatInspection.showDate)} {timePart(seatInspection.startTime)}</p>
                  <p className="muted-text" style={{ marginBottom: '12px' }}>Total: {seatInspection.summary?.total || 0} | Available: {seatInspection.summary?.available || 0} | Reserved: {seatInspection.summary?.reserved || 0} | Booked: {seatInspection.summary?.booked || 0} | Out of Service: {seatInspection.summary?.outOfService || 0}</p>
                  <table className="admin-table"><thead><tr><th>Seat</th><th>Type</th><th>Status</th></tr></thead><tbody>{(seatInspection.seats || []).map((seat) => (<tr key={seat.seatId}><td>{seat.label}</td><td>{seat.type}</td><td>{seat.status}</td></tr>))}</tbody></table>
                </>
              )}
            </section>
          )}
        </>
      )}

      {tab === 'bookings' && (
        <section className="account-panel admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Code</th><th>User</th><th>Movie</th><th>Cinema</th><th>Showtime</th><th>Seats</th><th>Total</th><th>Booking</th><th>Payment</th><th>Actions</th></tr></thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.bookingId}>
                  <td>{b.bookingCode || b.bookingId}</td><td>{b.userEmail || b.userId}</td><td>{b.movieTitle || '-'}</td><td>{b.cinemaName || '-'}</td>
                  <td>{datePart(b.showDate)} {timePart(b.startTime)}</td><td>{Array.isArray(b.seatDetails) ? b.seatDetails.map((x) => `${x.label}(${x.state})`).join(', ') : '-'}</td>
                  <td>{amountText(b.totalPrice)}</td><td>{b.bookingStatus}</td><td>{b.paymentStatus}</td>
                  <td>{b.bookingStatus === 'PENDING' ? <div className="admin-actions"><button className="btn btn-outline" onClick={() => updateBookingStatus(b.bookingId, 'CONFIRMED')}>Confirm</button><button className="btn btn-outline" onClick={() => updateBookingStatus(b.bookingId, 'EXPIRED')}>Expire</button><button className="btn btn-primary" onClick={() => updateBookingStatus(b.bookingId, 'CANCELLED')}>Cancel</button></div> : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'tickets' && (
        <section className="account-panel admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Ticket Code</th><th>Booking</th><th>User</th><th>Movie</th><th>Cinema</th><th>Auditorium</th><th>Showtime</th><th>Seat</th><th>Total</th><th>Booking</th><th>Payment</th><th>Issued</th></tr></thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td>{ticket.ticketCode || '-'}</td><td>{ticket.bookingCode || ticket.bookingId}</td><td>{ticket.userEmail || ticket.userId || '-'}</td>
                  <td>{ticket.movieTitle || '-'}</td><td>{ticket.cinemaName || '-'}</td><td>{ticket.auditoriumName || '-'}</td><td>{datePart(ticket.showDate)} {timePart(ticket.startTime)}</td>
                  <td>{ticket.seatLabel || '-'}</td><td>{amountText(ticket.totalPrice)}</td><td>{ticket.bookingStatus || '-'}</td><td>{ticket.paymentStatus || '-'}</td><td>{ticket.issuedAt ? new Date(ticket.issuedAt).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'users' && (
        <section className="account-panel admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Email</th><th>Roles</th><th>Plan</th><th>Bookings</th><th>Tickets</th><th>Online</th><th>Last Login</th></tr></thead>
            <tbody>
              {users.map((u) => (<tr key={u.id}><td>{u.email}</td><td>{u.roles}</td><td>{u.subscriptionPlan}</td><td>{u.bookingCount}</td><td>{u.ticketCount}</td><td>{u.online ? 'Yes' : 'No'}</td><td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '-'}</td></tr>))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'payments' && (
        <section className="account-panel admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Txn</th><th>Booking</th><th>User</th><th>Movie</th><th>Cinema</th><th>Date</th><th>Amount</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{p.txnCode}</td><td>{p.bookingCode || p.bookingId}</td><td>{p.userEmail || '-'}</td><td>{p.movieTitle || '-'}</td><td>{p.cinemaName || '-'}</td><td>{datePart(p.showDate)}</td>
                  <td>{amountText(p.amount)}</td><td>{p.status}</td><td>{p.createdAt ? new Date(p.createdAt).toLocaleString() : '-'}</td>
                  <td>{p.status === 'PENDING' ? <div className="admin-actions"><button className="btn btn-outline" onClick={() => simulatePayment(p.txnCode, true)}>Success</button><button className="btn btn-primary" onClick={() => simulatePayment(p.txnCode, false)}>Failure</button></div> : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

export default AdminCinema;
