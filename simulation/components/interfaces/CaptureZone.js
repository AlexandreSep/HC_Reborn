Engine.RegisterInterface("CaptureZone");

/**
 * Message of the form { "holder": entity ID that holds the capture zone, "players": [player ID's] }
 * sent from the CaptureZone whenever a player is present in that capture zone
 */
Engine.RegisterMessageType("CaptureZoneUpdate");