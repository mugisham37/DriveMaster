export function LegalsSection() {
  const currentYear = new Date().getFullYear()

  return (
    <section id="legals">
      <div className="md-container text-center">
        <strong>Exercism</strong>
        {' '}is a registered{' '}
        <strong>not-for-profit organisation.</strong>
        <span className="whitespace-nowrap">© {currentYear} Exercism</span>
      </div>
    </section>
  )
}