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
    title: 'Tro ly Moviex',
    subtitle: 'Phim, suat chieu, ghe, ve, goi dang ky va ho tro thanh toan.',
    placeholder: 'Hoi ve phim, ve, hoac dat ve...',
    send: 'Gui',
    sending: 'Dang tra loi...',
    open: 'Mo tro ly',
    close: 'Dong tro ly',
    suggestions: 'Ban co the hoi',
    fallbackError: 'Tro ly chua tai duoc du lieu luc nay.',
    welcome: 'Minh co the ho tro ve phim, suat chieu, ghe, ve, goi dang ky va thanh toan.',
    signIn: 'Can dang nhap',
    go: 'Mo',
  },
};

const PROMPTS_BY_PAGE = {
  default: {
    en: ['Recommend me a thriller movie', 'What movies are showing tonight?', 'What is included in Premium?'],
    vi: ['Goi y phim thriller cho minh', 'Toi nay co phim nao dang chieu?', 'Premium gom nhung gi?'],
  },
  cinema: {
    en: ['Help me book tickets', 'Which seats are best for 2 people?', 'Show my upcoming tickets'],
    vi: ['Huong dan dat ve', 'Ghe nao tot cho 2 nguoi?', 'Cho xem ve sap toi'],
  },
  payment: {
    en: ['Why did my payment fail?', 'What is included in Premium?', 'Where do I manage my subscription?'],
    vi: ['Vi sao thanh toan cua minh that bai?', 'Premium gom nhung gi?', 'Quan ly goi dang ky o dau?'],
  },
  subscription: {
    en: ['What is included in Premium?', 'Where do I manage my subscription?', 'Recommend me a thriller movie'],
    vi: ['Premium gom nhung gi?', 'Quan ly goi dang ky o dau?', 'Goi y phim thriller cho minh'],
  },
};

const buildMessage = (payload) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role: payload.role,
  text: payload.text || '',
  cards: Array.isArray(payload.cards) ? payload.cards : [],
  suggestions: Array.isArray(payload.suggestions) ? payload.suggestions : [],
  handoffPath: payload.handoffPath || '',
  handoffLabel: payload.handoffLabel || '',
  requiresAuth: Boolean(payload.requiresAuth),
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
  const [messages, setMessages] = useState(() => [
    buildMessage({
      role: 'assistant',
      text: copy.welcome,
      suggestions: starterPrompts,
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
        }),
      ];
    });
  }, [copy.welcome, starterPrompts]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isSending]);

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
              x
            </button>
          </header>

          <div ref={scrollRef} className="ai-assistant-messages scrollbar-slim">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`ai-assistant-message ${message.role === 'user' ? 'is-user' : 'is-assistant'}`}
              >
                <div className="ai-assistant-bubble">
                  <p>{message.text}</p>

                  {message.cards.length > 0 && (
                    <div className="ai-assistant-card-list">
                      {message.cards.map((card, index) => (
                        <div key={`${card.type || 'card'}-${index}`} className="ai-assistant-card">
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

                  {message.handoffPath && (
                    <button type="button" className="btn btn-primary ai-assistant-link" onClick={() => navigate(message.handoffPath)}>
                      {message.handoffLabel || (message.requiresAuth ? copy.signIn : copy.go)}
                    </button>
                  )}

                  {message.suggestions.length > 0 && (
                    <div className="ai-assistant-suggestions">
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
                <div className="ai-assistant-bubble is-loading">
                  <p>{copy.sending}</p>
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
