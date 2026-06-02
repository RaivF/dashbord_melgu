export default function Panel({ title, subtitle, children, className = '', action }) {
  return (
    <section className={`panel ${className}`}>
      {(title || subtitle || action) && (
        <div className="panel__header">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action && <div className="panel__action">{action}</div>}
        </div>
      )}
      {children}
    </section>
  )
}
