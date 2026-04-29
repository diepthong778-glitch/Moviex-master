import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';

function PageTransition({
  as: Component = 'div',
  className = '',
  delay = 0,
  style,
  children,
  ...rest
}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const mergedStyle = prefersReducedMotion
    ? style
    : {
        ...(style || {}),
        '--motion-enter-delay': `${Math.max(0, Number(delay) || 0)}ms`,
      };

  const classes = [
    'mx-motion-page',
    prefersReducedMotion ? 'is-ready' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={classes} style={mergedStyle} {...rest}>
      {children}
    </Component>
  );
}

export default PageTransition;
