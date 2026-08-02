namespace MetroVR
{
    /// <summary>
    /// Postura/comportamiento configurable de un pasajero del metro.
    /// Es el "interruptor" principal que tú controlas desde el Inspector
    /// o en tiempo de ejecución con <see cref="MetroPassenger.SetState"/>.
    /// </summary>
    public enum PassengerState
    {
        /// <summary>De pie, sujetando la varilla/barra con las manos (usa IK).</summary>
        StandingHoldingRail,

        /// <summary>Sentado en un asiento del vagón.</summary>
        Seated
    }
}
