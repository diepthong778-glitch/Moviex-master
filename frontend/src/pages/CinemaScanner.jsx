import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { 
  HiOutlineCamera, 
  HiOutlineTicket, 
  HiOutlineCheckCircle, 
  HiOutlineXCircle, 
  HiOutlineExclamationCircle,
  HiOutlineClock,
  HiOutlineRefresh,
  HiOutlineArrowLeft
} from 'react-icons/hi';
import { Link } from 'react-router-dom';
import { scanCinemaTicket } from '../utils/cinemaApi';

const CinemaScanner = () => {
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  // Audio feedback using Web Audio API
  const playSound = (type) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'success') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.2);
      } else if (type === 'error') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn('Audio feedback failed', e);
    }
  };

  useEffect(() => {
    if (isScanning && !loading) {
      startScanner();
    }
    return () => stopScanner();
  }, [isScanning]);

  const startScanner = () => {
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    html5QrCodeRef.current = new Html5Qrcode("reader");
    html5QrCodeRef.current.start(
      { facingMode: "environment" },
      config,
      onScanSuccess,
      onScanFailure
    ).catch(err => {
      console.error("Camera access error:", err);
      setError("Unable to access camera. Please check permissions.");
    });
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      await html5QrCodeRef.current.stop();
    }
  };

  const onScanSuccess = async (decodedText) => {
    console.log("Decoded text:", decodedText);
    await stopScanner();
    setIsScanning(false);
    handleScan(decodedText);
  };

  const onScanFailure = (error) => {
    // Silently ignore failures to keep UI clean
    // console.warn(`QR error = ${error}`);
  };

  const handleScan = async (qrToken) => {
    setLoading(true);
    setError(null);
    try {
      const result = await scanCinemaTicket(qrToken);
      setScanResult(result);
      
      if (result.state === 'VALID') {
        playSound('success');
      } else {
        playSound('error');
      }
    } catch (err) {
      console.error("Scan error:", err);
      setError(err.response?.data?.message || "Validation failed. Please try again.");
      playSound('error');
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setError(null);
    setIsScanning(true);
  };

  const renderStatusIcon = (state) => {
    switch (state) {
      case 'VALID':
        return <HiOutlineCheckCircle className="text-emerald-500 text-6xl" />;
      case 'ALREADY_USED':
        return <HiOutlineExclamationCircle className="text-amber-500 text-6xl" />;
      case 'EXPIRED':
        return <HiOutlineClock className="text-gray-400 text-6xl" />;
      case 'PAYMENT_PENDING':
        return <HiOutlineClock className="text-blue-500 text-6xl" />;
      default:
        return <HiOutlineXCircle className="text-rose-500 text-6xl" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#090c15] text-white p-4 font-sans selection:bg-rose-500/30">
      {/* Header */}
      <div className="max-w-md mx-auto flex items-center justify-between mb-8">
        <Link to="/admin" className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <HiOutlineArrowLeft className="text-2xl" />
        </Link>
        <h1 className="text-xl font-bold tracking-tight">TICKET SCANNER</h1>
        <div className="w-10"></div>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* Scanner Window */}
        {isScanning && (
          <div className="relative aspect-square bg-black/40 rounded-3xl overflow-hidden border border-white/10 ring-1 ring-white/5 shadow-2xl">
            <div id="reader" className="w-full h-full"></div>
            
            {/* Custom Overlay for Scanner */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              {/* Animated Scan Line */}
              <div className="w-[250px] h-[250px] border-2 border-white/20 rounded-2xl relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-rose-500 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-rose-500 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-rose-500 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-rose-500 rounded-br-lg"></div>
                
                <div className="absolute left-0 w-full h-[2px] bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-scan-line"></div>
              </div>
              <p className="mt-6 text-sm text-white/50 font-medium tracking-wide uppercase">Align QR Code in frame</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-12 text-center border border-white/10 shadow-2xl animate-pulse">
            <div className="w-12 h-12 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg font-medium">Validating Ticket...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-rose-500/10 backdrop-blur-xl rounded-3xl p-8 text-center border border-rose-500/30 shadow-2xl">
            <HiOutlineXCircle className="text-rose-500 text-6xl mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2 text-rose-500 uppercase">Scan Error</h2>
            <p className="text-white/70 mb-6">{error}</p>
            <button 
              onClick={resetScanner}
              className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold transition-all transform active:scale-95 flex items-center justify-center gap-2"
            >
              <HiOutlineRefresh className="text-xl" />
              TRY AGAIN
            </button>
          </div>
        )}

        {/* Result Card */}
        {scanResult && !loading && (
          <div className="space-y-4 animate-slide-up">
            <div className={`
              rounded-3xl p-8 text-center border shadow-2xl
              ${scanResult.state === 'VALID' ? 'bg-emerald-500/10 border-emerald-500/30' : 
                scanResult.state === 'ALREADY_USED' ? 'bg-amber-500/10 border-amber-500/30' : 
                'bg-rose-500/10 border-rose-500/30'}
            `}>
              {renderStatusIcon(scanResult.state)}
              <h2 className={`
                text-2xl font-bold mt-4 mb-2 uppercase tracking-tight
                ${scanResult.state === 'VALID' ? 'text-emerald-500' : 
                  scanResult.state === 'ALREADY_USED' ? 'text-amber-500' : 
                  'text-rose-500'}
              `}>
                {scanResult.state.replace('_', ' ')}
              </h2>
              <p className="text-white/70">{scanResult.message}</p>
            </div>

            {scanResult.ticketDetail && (
              <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-xl space-y-4">
                <div className="flex gap-4">
                  <div className="w-24 h-36 bg-white/10 rounded-xl overflow-hidden flex-shrink-0 border border-white/5">
                    {/* Placeholder for poster or actual image if available in ticketDetail */}
                    <div className="w-full h-full flex items-center justify-center bg-rose-500/20">
                      <HiOutlineTicket className="text-4xl text-rose-500/50" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold truncate leading-tight mb-1">
                      {scanResult.ticketDetail.movieTitle}
                    </h3>
                    <p className="text-rose-500 font-bold text-sm mb-2">{scanResult.ticketDetail.cinemaName}</p>
                    
                    <div className="grid grid-cols-2 gap-y-2 text-sm text-white/60">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-white/30">Auditorium</p>
                        <p className="text-white">{scanResult.ticketDetail.auditoriumName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-white/30">Seats</p>
                        <p className="text-white truncate">{scanResult.ticketDetail.seats?.join(', ')}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-white/30">Showtime</p>
                        <p className="text-white">
                          {scanResult.ticketDetail.showDate} @ {scanResult.ticketDetail.startTime}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/40 uppercase font-bold tracking-widest">Booking Code</span>
                    <span className="font-mono text-white/80">{scanResult.ticketDetail.bookingCode}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/40 uppercase font-bold tracking-widest">Customer</span>
                    <span className="text-white/80">{scanResult.ticketDetail.userEmail || 'Guest'}</span>
                  </div>
                  {scanResult.scannedAt && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/40 uppercase font-bold tracking-widest">Scan Time</span>
                      <span className="text-white/80">{new Date(scanResult.scannedAt).toLocaleTimeString()}</span>
                    </div>
                  )}
                  {scanResult.scannedBy && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/40 uppercase font-bold tracking-widest">Staff</span>
                      <span className="text-white/80 truncate max-w-[150px]">{scanResult.scannedBy}</span>
                    </div>
                  )}
                </div>

                <button 
                  onClick={resetScanner}
                  className="w-full py-4 mt-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 border border-white/5"
                >
                  <HiOutlineCamera className="text-xl" />
                  SCAN NEXT TICKET
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan-line {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan-line {
          animation: scan-line 2.5s linear infinite;
        }
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.4s cubic-bezier(0, 0, 0.2, 1) forwards;
        }
        #reader {
          background: transparent !important;
          border: none !important;
        }
        #reader video {
          object-fit: cover !important;
          border-radius: 1.5rem !important;
        }
        #reader__dashboard {
          display: none !important;
        }
        #reader__scan_region {
          background: transparent !important;
        }
      `}} />
    </div>
  );
};

export default CinemaScanner;
