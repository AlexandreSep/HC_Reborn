// Returns a Set that contains all entities that are in the selected battalion.
// This will always select the whole battalion if the player clicks on one unit
EntitySelection.prototype.AddAllEntsOfSelectedBattalions = function(ents)
{
	let tmpEnts = new Set();
	let selectedBattalions = new Set();	
	for (let ent of ents){

		// This block only selects a single entity of enemy troops
		// Selecting enemy battalion does not work for the moment
		let entState = GetEntityState(ent);
		if (!entState)
			continue;

		let isUnowned = g_ViewedPlayer != -1 && entState.player != g_ViewedPlayer ||
		                g_ViewedPlayer == -1 && entState.player == 0;

		if (isUnowned){
			tmpEnts.add(ent);
			continue;
		}

		// Here is the code for selecting our own battalions
		tmpEnts.add(ent);
		let battalionData = Engine.GuiInterfaceCall("GetBattalionInformationFromEntityId", ent);
		if (!battalionData){
			continue;
		}
		
		for (let entityToAdd of battalionData.entities){
			tmpEnts.add(entityToAdd);
		}

		if (battalionData.playerID == Engine.GetPlayerID()){
			selectedBattalions.add(battalionData.battalionID);
		}
	}
	
	if (!Engine.HotkeyIsPressed("selection.add")){
		MarkAllBattalionsUnselected(Engine.GetPlayerID());
	}
	for(let battalionID of selectedBattalions){
		MarkBattalionSelectedViaBattalionID (battalionID, Engine.GetPlayerID());
	}
	
	return tmpEnts;
}
