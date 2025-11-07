export function Footer() {
  return (
    <footer className="bg-primary-dark text-white mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-3">🍕 Pizzería Bella Napoli</h3>
            <p className="text-white/80">Las mejores pizzas artesanales de la ciudad</p>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Horario</h4>
            <p className="text-white/80">Lunes a Viernes: 12:00 - 23:00</p>
            <p className="text-white/80">Sábados y Domingos: 12:00 - 00:00</p>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Contacto</h4>
            <p className="text-white/80">📞 +34 123 456 789</p>
            <p className="text-white/80">📧 info@bellanapoli.com</p>
            <p className="text-white/80">📍 Calle Principal, 123</p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/20 text-center text-white/70">
          <p>&copy; {new Date().getFullYear()} Pizzería Bella Napoli. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
