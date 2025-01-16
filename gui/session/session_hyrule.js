function AddAverageGatherRateToResourceCounter(){
    let resCodes = g_ResourceData.GetCodes();
	for (let r = 0; r < resCodes.length; ++r){
		let res = resCodes[r];
		let viewedPlayerState = g_SimState.players[g_ViewedPlayer];
		if (!viewedPlayerState){
			return;
		}
		let collectedResourcesLastInterval =  viewedPlayerState.collectedResourcesLastInterval[res];
		let gatherRateUpdateTime =  viewedPlayerState.gatherRateUpdateTime / 1000;
		Engine.GetGUIObjectByName("resource[" + r + "]_count").caption = Math.floor(viewedPlayerState.resourceCounts[res]) + " + " + collectedResourcesLastInterval + "/" + gatherRateUpdateTime + "s";
	}
}
