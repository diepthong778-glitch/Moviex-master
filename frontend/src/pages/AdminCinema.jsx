import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'branches', label: 'Branches' },
  { key: 'auditoriums', label: 'Auditoriums' },
  { key: 'seats', label: 'Seats' },
  { key: 'showtimes', label: 'Showtimes' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'users', label: 'Users' },
  { key: 'payments', label: 'Payments' },
];

const initialBranch = { name: '', address: '', city: '', active: true };
const initialAuditorium = { cinemaId: '', name: '', capacity: 96, active: true };
const initialShowtime = { movieId: '', cinemaId: '', auditoriumId: '', showDate: '', startTime: '', endTime: '', basePrice: 0 };
const initialSeatLayout = { auditoriumId: '', rows: 'ABCDEFGH', seatsPerRow: 12, vipRows: 'CD', coupleRows: 'GH' };

const datePart = (v) => (v ? String(v).slice(0, 10) : '-');
const timePart = (v) => (v ? String(v).slice(0, 5) : '--:--');

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
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);

  const [branchForm, setBranchForm] = useState(initialBranch);
  const [auditoriumForm, setAuditoriumForm] = useState(initialAuditorium);
  const [showtimeForm, setShowtimeForm] = useState(initialShowtime);
  const [seatLayoutForm, setSeatLayoutForm] = useState(initialSeatLayout);

  const [editBranchId, setEditBranchId] = useState(null);
  const [editAuditoriumId, setEditAuditoriumId] = useState(null);
  const [editShowtimeId, setEditShowtimeId] = useState(null);

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

  const loadByTab = async () => {
    if (tab === 'dashboard') await loadStats();
    if (tab === 'branches') setBranches((await axios.get('/api/admin/cinema/branches')).data || []);
    if (tab === 'auditoriums') setAuditoriums((await axios.get('/api/admin/cinema/auditoriums')).data || []);
    if (tab === 'seats') {
      const params = seatLayoutForm.auditoriumId ? { auditoriumId: seatLayoutForm.auditoriumId } : {};
      setSeats((await axios.get('/api/admin/cinema/seats', { params })).data || []);
    }
    if (tab === 'showtimes') setShowtimes((await axios.get('/api/admin/cinema/showtimes')).data || []);
    if (tab === 'bookings') setBookings((await axios.get('/api/admin/cinema/bookings', { params: { limit: 200 } })).data || []);
    if (tab === 'users') setUsers((await axios.get('/api/admin/cinema/users')).data || []);
    if (tab === 'payments') setPayments((await axios.get('/api/admin/cinema/payments', { params: { limit: 200 } })).data || []);
  };

  useEffect(() => {
    runTask(async () => {
      await Promise.all([loadStats(), loadReference()]);
    });
  }, []);

  useEffect(() => {
    runTask(async () => {
      await loadByTab();
    });
  }, [tab, seatLayoutForm.auditoriumId]);

  const saveBranch = async (event) => {
    event.preventDefault();
    await runTask(async () => {
      if (editBranchId) await axios.put(`/api/admin/cinema/branches/${editBranchId}`, branchForm);
      else await axios.post('/api/admin/cinema/branches', branchForm);
      setBranchForm(initialBranch);
      setEditBranchId(null);
      await Promise.all([loadStats(), loadReference(), loadByTab()]);
      notify('Branch saved');
    });
  };

  const toggleBranch = async (branchId, active) => {
    await runTask(async () => {
      await axios.patch(`/api/admin/cinema/branches/${branchId}/active`, null, { params: { active } });
      await Promise.all([loadStats(), loadReference(), loadByTab()]);
      notify(`Branch ${active ? 'activated' : 'deactivated'}`);
    });
  };

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
      setAuditoriumForm(initialAuditorium);
      setEditAuditoriumId(null);
      await Promise.all([loadStats(), loadReference(), loadByTab()]);
      notify('Auditorium saved');
    });
  };

  const toggleAuditorium = async (auditoriumId, active) => {
    await runTask(async () => {
      await axios.patch(`/api/admin/cinema/auditoriums/${auditoriumId}/active`, null, { params: { active } });
      await Promise.all([loadStats(), loadReference(), loadByTab()]);
      notify(`Auditorium ${active ? 'activated' : 'deactivated'}`);
    });
  };

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
    if (!seatLayoutForm.auditoriumId) {
      setError('Please choose an auditorium first');
      return;
    }
    await runTask(async () => {
      await axios.post(`/api/admin/cinema/auditoriums/${seatLayoutForm.auditoriumId}/layout`, {
        ...seatLayoutForm,
        seatsPerRow: Number(seatLayoutForm.seatsPerRow),
      });
      await Promise.all([loadStats(), loadByTab()]);
      notify('Seat layout generated');
    });
  };

  const updateSeatStatus = async (seatId, status) => {
    await runTask(async () => {
      await axios.put(`/api/admin/cinema/seats/${seatId}`, { status });
      await Promise.all([loadStats(), loadByTab()]);
      notify(`Seat updated: ${status}`);
    });
  };

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
      const payload = {
        ...showtimeForm,
        basePrice: Number(showtimeForm.basePrice),
      };
      if (editShowtimeId) await axios.put(`/api/admin/cinema/showtimes/${editShowtimeId}`, payload);
      else await axios.post('/api/admin/cinema/showtimes', payload);
      setShowtimeForm(initialShowtime);
      setEditShowtimeId(null);
      await Promise.all([loadStats(), loadByTab()]);
      notify('Showtime saved');
    });
  };

  const toggleShowtime = async (showtimeId, active) => {
    await runTask(async () => {
      await axios.patch(`/api/admin/cinema/showtimes/${showtimeId}/active`, null, { params: { active } });
      await Promise.all([loadStats(), loadByTab()]);
      notify(`Showtime ${active ? 'activated' : 'deactivated'}`);
    });
  };

  const deleteShowtime = async (showtimeId) => {
    if (!window.confirm('Delete this showtime?')) return;
    await runTask(async () => {
      await axios.delete(`/api/admin/cinema/showtimes/${showtimeId}`);
      await Promise.all([loadStats(), loadByTab()]);
      notify('Showtime deleted');
    });
  };

  const updateBookingStatus = async (bookingId, bookingStatus) => {
    await runTask(async () => {
      await axios.patch(`/api/admin/cinema/bookings/${bookingId}/status`, { bookingStatus });
      await Promise.all([loadStats(), loadByTab()]);
      notify(`Booking ${bookingStatus}`);
    });
  };

  const simulatePayment = async (txnCode, success) => {
    await runTask(async () => {
      await axios.post(`/api/admin/cinema/payments/${txnCode}/simulate`, null, { params: { success } });
      await Promise.all([loadStats(), loadByTab()]);
      notify(`Payment ${success ? 'success' : 'failure'} simulated`);
    });
  };

  return (
    <div className="page-shell admin-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">JDWoMoviex Cinema Admin</h1>
          <p className="page-subtitle">Cinema branch, auditorium, seat, showtime, booking, user, payment management</p>
        </div>
      </div>

      <section className="account-panel">
        <div className="admin-form-actions" style={{ flexWrap: 'wrap' }}>
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`btn ${tab === item.key ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

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
          <article className="admin-stat-card"><span className="admin-stat-label">Payments</span><strong className="admin-stat-value">{stats.paymentsTotal || 0}</strong></article>
          <article className="admin-stat-card"><span className="admin-stat-label">Users</span><strong className="admin-stat-value">{stats.usersTotal || 0}</strong></article>
          <article className="admin-stat-card"><span className="admin-stat-label">Tickets</span><strong className="admin-stat-value">{stats.ticketsTotal || 0}</strong></article>
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
                    <td>{seat.row}{seat.number}</td>
                    <td>{seat.type}</td>
                    <td>{seat.status}</td>
                    <td>{auditoriumName.get(seat.auditoriumId) || seat.auditoriumId}</td>
                    <td>
                      <div className="admin-actions">
                        <button
                          className="btn btn-outline"
                          onClick={() => updateSeatStatus(seat.id, seat.status === 'OUT_OF_SERVICE' ? 'AVAILABLE' : 'OUT_OF_SERVICE')}
                        >
                          {seat.status === 'OUT_OF_SERVICE' ? 'Activate' : 'Deactivate'}
                        </button>
                        <button className="btn btn-primary" onClick={() => deleteSeat(seat.id)}>Delete</button>
                      </div>
                    </td>
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
              <select className="field-control" value={showtimeForm.cinemaId} onChange={(e) => setShowtimeForm((s) => ({ ...s, cinemaId: e.target.value }))} required>
                <option value="">Select cinema</option>
                {reference.cinemas.map((cinema) => <option key={cinema.id} value={cinema.id}>{cinema.name}</option>)}
              </select>
              <select className="field-control" value={showtimeForm.auditoriumId} onChange={(e) => setShowtimeForm((s) => ({ ...s, auditoriumId: e.target.value }))} required>
                <option value="">Select auditorium</option>
                {reference.auditoriums.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
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
                      <button className="btn btn-outline" onClick={() => toggleShowtime(showtime.id, showtime.status !== 'SCHEDULED')}>{showtime.status === 'SCHEDULED' ? 'Deactivate' : 'Activate'}</button>
                      <button className="btn btn-primary" onClick={() => deleteShowtime(showtime.id)}>Delete</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      {tab === 'bookings' && (
        <section className="account-panel admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Code</th><th>User</th><th>Movie</th><th>Showtime</th><th>Seats</th><th>Total</th><th>Booking</th><th>Payment</th><th>Actions</th></tr></thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.bookingId}>
                  <td>{b.bookingCode || b.bookingId}</td><td>{b.userEmail || b.userId}</td><td>{b.movieTitle || '-'}</td>
                  <td>{datePart(b.showDate)} {timePart(b.startTime)}</td>
                  <td>{Array.isArray(b.seatDetails) ? b.seatDetails.map((x) => `${x.label}(${x.state})`).join(', ') : '-'}</td>
                  <td>{Number(b.totalPrice || 0).toLocaleString('vi-VN')} VND</td><td>{b.bookingStatus}</td><td>{b.paymentStatus}</td>
                  <td>{b.bookingStatus === 'PENDING' ? <div className="admin-actions"><button className="btn btn-outline" onClick={() => updateBookingStatus(b.bookingId, 'CONFIRMED')}>Confirm</button><button className="btn btn-outline" onClick={() => updateBookingStatus(b.bookingId, 'EXPIRED')}>Expire</button><button className="btn btn-primary" onClick={() => updateBookingStatus(b.bookingId, 'CANCELLED')}>Cancel</button></div> : '-'}</td>
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
              {users.map((u) => (
                <tr key={u.id}><td>{u.email}</td><td>{u.roles}</td><td>{u.subscriptionPlan}</td><td>{u.bookingCount}</td><td>{u.ticketCount}</td><td>{u.online ? 'Yes' : 'No'}</td><td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '-'}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'payments' && (
        <section className="account-panel admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Txn</th><th>Booking</th><th>User</th><th>Amount</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{p.txnCode}</td><td>{p.bookingCode || p.bookingId}</td><td>{p.userEmail || '-'}</td>
                  <td>{Number(p.amount || 0).toLocaleString('vi-VN')} VND</td><td>{p.status}</td><td>{p.createdAt ? new Date(p.createdAt).toLocaleString() : '-'}</td>
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
