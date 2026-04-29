import useInView from '../../hooks/useInView';

function Reveal({
  as: Component = 'div',
  className = '',
  delay = 0,
  y = 18,
  threshold = 0.12,
  root = null,
  rootMargin = '0px 0px -8% 0px',
  once = true,
  forceVisible = false,
  fallbackMs = null,
  style,
  children,
  ...rest
}) {
  const { ref, isInView, prefersReducedMotion } = useInView({
    threshold,
    root,
    rootMargin,
    once,
    fallbackMs,
  });

  const mergedStyle = prefersReducedMotion
    ? style
    : {
        ...(style || {}),
        '--motion-reveal-delay': `${Math.max(0, Number(delay) || 0)}ms`,
        '--motion-reveal-y': `${Math.max(0, Number(y) || 0)}px`,
      };

  const classes = [
    'mx-reveal',
    forceVisible || isInView || prefersReducedMotion ? 'is-in-view' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component ref={ref} className={classes} style={mergedStyle} {...rest}>
      {children}
    </Component>
  );
}

export default Reveal;
