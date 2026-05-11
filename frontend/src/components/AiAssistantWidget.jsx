import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCinemaBooking } from '../context/CinemaBookingContext';
import { chatWithAssistant } from '../utils/assistantApi';
import { extractErrorMessage } from '../utils/api';

const MAX_HISTORY = 6;

const UI_COPY = {
  en: {
    badge: 'AI',
    title: 'Moviex Assistant',
    subtitle: 'Movies, showtimes, seats, tickets, plans, and payment support.',
    placeholder: 'Ask about movies, tickets, or booking help...',
    send: 'Send',
    sending: 'Thinking...',
    open: 'Open assistant',
    close: 'Close assistant',
    suggestions: 'Try asking',
    fallbackError: 'The assistant could not load data right now.',
    welcome: 'Ask me about movies, showtimes, seats, tickets, plans, or payment help.',
    signIn: 'Sign in required',
    go: 'Open',
  },
  vi: {
    badge: 'AI',
    title: 'Trợ lý Moviex',
    subtitle: 'Phim, suất chiếu, ghế, vé, gói đăng ký và hỗ trợ thanh toán.',
    placeholder: 'Hỏi về phim, vé, hoặc đặt vé...',
    send: 'Gửi',
    sending: 'Đang trả lời...',
    open: 'Mở trợ lý',
    close: 'Đóng trợ lý',
    suggestions: 'Bạn có thể hỏi',
    fallbackError: 'Trợ lý chưa tải được dữ liệu lúc này.',
    welcome: 'Mình có thể hỗ trợ về phim, suất chiếu, ghế, vé, gói đăng ký và thanh toán.',
    signIn: 'Cần đăng nhập',
    go: 'Mở',
  },
};

const THINKING_STATES = {
  en: [
    'Understanding your request...',
    'Checking movie database...',
    'Looking for available showtimes...',
    'Checking your booking...',
    'Analyzing seat availability...',
    'Reviewing payment status...'
  ],
  vi: [
    'Đang hiểu yêu cầu...',
    'Kiểm tra cơ sở dữ liệu phim...',
    'Đang tìm suất chiếu phù hợp...',
    'Đang kiểm tra vé của bạn...',
    'Phân tích trạng thái ghế...',
    'Đang kiểm tra thanh toán...'
  ]
};

const PROMPTS_BY_PAGE = {
  default: {
    en: ['Recommend me a thriller movie', 'What movies are showing tonight?', 'What is included in Premium?'],
    vi: ['Gợi ý phim thriller cho mình', 'Tối nay có phim nào đang chiếu?', 'Premium gồm những gì?'],
  },
  cinema: {
    en: ['Help me book tickets', 'Which seats are best for 2 people?', 'Show my upcoming tickets'],
    vi: ['Hướng dẫn đặt vé', 'Ghế nào tốt cho 2 người?', 'Cho xem vé sắp tới'],
  },
  payment: {
    en: ['Why did my payment fail?', 'What is included in Premium?', 'Where do I manage my subscription?'],
    vi: ['Vì sao thanh toán của mình thất bại?', 'Premium gồm những gì?', 'Quản lý gói đăng ký ở đâu?'],
  },
  subscription: {
    en: ['What is included in Premium?', 'Where do I manage my subscription?', 'Recommend me a thriller movie'],
    vi: ['Premium gồm những gì?', 'Quản lý gói đăng ký ở đâu?', 'Gợi ý phim thriller cho mình'],
  },
};

const buildMessage = (payload) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role: payload.role,
  text: payload.text || '',
  displayedText: payload.role === 'user' ? (payload.text || '') : '',
  cards: Array.isArray(payload.cards) ? payload.cards : [],
  suggestions: Array.isArray(payload.suggestions) ? payload.suggestions : [],
  handoffPath: payload.handoffPath || '',
  handoffLabel: payload.handoffLabel || '',
  requiresAuth: Boolean(payload.requiresAuth),
  isStreaming: payload.role === 'assistant' && !payload.disableStreaming,
});

const resolveLocaleKey = (language) => (String(language || '').toLowerCase().startsWith('vi') ? 'vi' : 'en');

const resolvePageKey = (pathname) => {
  if (pathname.startsWith('/cinema')) return 'cinema';
  if (pathname.startsWith('/payment')) return 'payment';
  if (pathname.startsWith('/plans') || pathname.startsWith('/subscription')) return 'subscription';
  return 'default';
};

const extractPathParam = (pathname, pattern) => {
  const match = pathname.match(pattern);
  return match?.[1] || '';
};

function AiAssistantWidget() {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();
  const { showtime, seatIds, seatLabels } = useCinemaBooking();

  const localeKey = resolveLocaleKey(i18n.language);
  const copy = UI_COPY[localeKey];
  const pageKey = resolvePageKey(location.pathname);
  const promptSet = PROMPTS_BY_PAGE[pageKey] || PROMPTS_BY_PAGE.default;
  const starterPrompts = promptSet[localeKey];
  const scrollRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const [messages, setMessages] = useState(() => [
    buildMessage({
      role: 'assistant',
      text: copy.welcome,
      suggestions: starterPrompts,
      disableStreaming: true,
    }),
  ]);

  const requestContext = useMemo(() => ({
    route: `${location.pathname}${location.search || ''}`,
    page: pageKey,
    movieId: extractPathParam(location.pathname, /^\/cinema\/movie\/([^/]+)/) || showtime?.movieId || showtime?.movie?.id || '',
    showtimeId: showtime?.id || '',
    bookingId: extractPathParam(location.pathname, /^\/cinema\/tickets\/([^/]+)/),
    cinemaId: showtime?.cinemaId || '',
    seatIds: Array.isArray(seatIds) ? seatIds : [],
    seatLabels: Array.isArray(seatLabels) ? seatLabels : [],
  }), [location.pathname, location.search, pageKey, showtime, seatIds, seatLabels]);

  useEffect(() => {
    setMessages((current) => {
      if (current.length !== 1 || current[0].role !== 'assistant') {
        return current;
      }

      return [
        buildMessage({
          role: 'assistant',
          text: copy.welcome,
          suggestions: starterPrompts,
          disableStreaming: true,
        }),
      ];
    });
  }, [copy.welcome, starterPrompts]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isSending, thinkingIndex]);

  useEffect(() => {
    let interval;
    if (isSending) {
      setThinkingIndex(0);
      interval = setInterval(() => {
        setThinkingIndex((current) => (current + 1) % THINKING_STATES[localeKey].length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isSending, localeKey]);

  useEffect(() => {
    const streamingMessageIndex = messages.findIndex(m => m.isStreaming);
    if (streamingMessageIndex === -1) return;

    const message = messages[streamingMessageIndex];
    if (message.displayedText.length < message.text.length) {
      const timeout = setTimeout(() => {
        setMessages(current => {
          const next = [...current];
          next[streamingMessageIndex] = {
            ...message,
            displayedText: message.text.slice(0, message.displayedText.length + 1)
          };
          return next;
        });
      }, 15);
      return () => clearTimeout(timeout);
    } else {
      setMessages(current => {
        const next = [...current];
        next[streamingMessageIndex] = {
          ...message,
          isStreaming: false
        };
        return next;
      });
    }
  }, [messages]);

  const submitPrompt = async (prompt) => {
    const message = String(prompt || draft).trim();
    if (!message || isSending) return;

    const userMessage = buildMessage({ role: 'user', text: message });
    const historyBase = [...messages, userMessage]
      .filter((item) => item.text)
      .slice(-MAX_HISTORY)
      .map((item) => ({
        role: item.role,
        content: item.text,
      }));

    setDraft('');
    setError('');
    setIsSending(true);
    setMessages((current) => [...current, userMessage]);

    try {
      const response = await chatWithAssistant({
        message,
        locale: localeKey,
        history: historyBase,
        context: requestContext,
      });

      setMessages((current) => [...current, buildMessage({
        role: 'assistant',
        text: response?.answer || copy.fallbackError,
        cards: response?.cards,
        suggestions: response?.suggestions?.length ? response.suggestions : starterPrompts,
        handoffPath: response?.handoffPath,
        handoffLabel: response?.handoffLabel,
        requiresAuth: response?.requiresAuth,
      })]);
    } catch (requestError) {
      const messageText = extractErrorMessage(requestError, copy.fallbackError);
      setError(messageText);
      setMessages((current) => [...current, buildMessage({
        role: 'assistant',
        text: copy.fallbackError,
        suggestions: starterPrompts,
      })]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={`ai-assistant${isOpen ? ' is-open' : ''}`}>
      <button
        type="button"
        className="ai-assistant-toggle mx-pressable"
        aria-label={isOpen ? copy.close : copy.open}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="ai-assistant-toggle-badge">{copy.badge}</span>
        <span className="ai-assistant-toggle-text">{copy.title}</span>
      </button>

      {isOpen && (
        <section className="ai-assistant-panel" aria-label={copy.title}>
          <header className="ai-assistant-header">
            <div>
              <p className="ai-assistant-kicker">{copy.badge}</p>
              <h2>{copy.title}</h2>
              <p>{copy.subtitle}</p>
            </div>
            <button type="button" className="ai-assistant-close" onClick={() => setIsOpen(false)} aria-label={copy.close}>
              ×
            </button>
          </header>

          <div ref={scrollRef} className="ai-assistant-messages scrollbar-slim">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`ai-assistant-message ${message.role === 'user' ? 'is-user' : 'is-assistant'}`}
              >
                <div className="ai-assistant-bubble">
                  <p>{message.role === 'user' ? message.text : message.displayedText}</p>

                  {!message.isStreaming && message.cards.length > 0 && (
                    <div className="ai-assistant-card-list">
                      {message.cards.map((card, index) => (
                        <div key={`${card.type || 'card'}-${index}`} className="ai-assistant-card ai-assistant-fade-in">
                          <div className="ai-assistant-card-head">
                            <strong>{card.title}</strong>
                            {card.subtitle && <span>{card.subtitle}</span>}
                          </div>
                          {card.description && <p className="ai-assistant-card-copy">{card.description}</p>}
                          {card.badges?.length > 0 && (
                            <div className="ai-assistant-card-badges">
                              {card.badges.map((badge) => <span key={badge}>{badge}</span>)}
                            </div>
                          )}
                          {card.details?.length > 0 && (
                            <ul className="ai-assistant-card-details">
                              {card.details.map((detail) => <li key={detail}>{detail}</li>)}
                            </ul>
                          )}
                          {card.actionPath && (
                            <button type="button" className="btn btn-outline ai-assistant-link" onClick={() => navigate(card.actionPath)}>
                              {card.actionLabel || copy.go}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {!message.isStreaming && message.handoffPath && (
                    <button type="button" className="btn btn-primary ai-assistant-link ai-assistant-fade-in" onClick={() => navigate(message.handoffPath)}>
                      {message.handoffLabel || (message.requiresAuth ? copy.signIn : copy.go)}
                    </button>
                  )}

                  {!message.isStreaming && message.suggestions.length > 0 && (
                    <div className="ai-assistant-suggestions ai-assistant-fade-in">
                      {message.suggestions.map((suggestion) => (
                        <button key={suggestion} type="button" className="ai-assistant-chip" onClick={() => submitPrompt(suggestion)}>
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}

            {isSending && (
              <article className="ai-assistant-message is-assistant">
                <div className="ai-assistant-bubble is-loading ai-assistant-shimmer">
                  <p>{THINKING_STATES[localeKey][thinkingIndex]}</p>
                </div>
              </article>
            )}
          </div>

          <footer className="ai-assistant-footer">
            <p className="ai-assistant-footer-label">{copy.suggestions}</p>
            <div className="ai-assistant-prompt-row">
              {starterPrompts.map((prompt) => (
                <button key={prompt} type="button" className="ai-assistant-chip" onClick={() => submitPrompt(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>

            <form className="ai-assistant-form" onSubmit={(event) => {
              event.preventDefault();
              submitPrompt();
            }}>
              <input
                className="ai-assistant-input"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={copy.placeholder}
                maxLength={800}
              />
              <button type="submit" className="btn btn-primary ai-assistant-send" disabled={isSending || !draft.trim()}>
                {copy.send}
              </button>
            </form>

            {error && <p className="ai-assistant-error">{error}</p>}
          </footer>
        </section>
      )}
    </div>
  );
}

export default AiAssistantWidget;
