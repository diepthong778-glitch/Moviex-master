import useInView from '../../hooks/useInView';

function StaggerGroup({
  as: Component = 'div',
  className = '',
  threshold = 0.08,
  root = null,
  rootMargin = '0px 0px -8% 0px',
  once = true,
  forceVisible = false,
  fallbackMs = null,
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

  const classes = [
    'mx-stagger-group',
    forceVisible || isInView || prefersReducedMotion ? 'is-in-view' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component ref={ref} className={classes} {...rest}>
      {children}
    </Component>
  );
}

export default StaggerGroup;
