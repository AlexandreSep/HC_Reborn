Engine.RegisterInterface("ResourceSupply");

/**
 * Message of the form { "player": number, "tech": string }
 * sent from TechnologyManager component whenever a technology research is finished.
 */
Engine.RegisterMessageType("ResourceSupplyNumGatherersChanged");
Engine.RegisterMessageType("ResourceSupplyChanged");
