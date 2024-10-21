function AddAverageGatherRateToResourceCounter(){
    let resCodes = g_ResourceData.GetCodes();
	for (let r = 0; r < resCodes.length; ++r){
		let res = resCodes[r];
		let viewedPlayerState = g_SimState.players[g_ViewedPlayer];
		if (!viewedPlayerState){
			return;
		}
		let averageResourceGatherRate =  viewedPlayerState.averageResourceGatherRates[res];
		let resourceBufferUpdateTime =  viewedPlayerState.resourceBufferUpdateTime/1000;
		let resourceBufferGatherRatePerSeconds =  viewedPlayerState.resourceBufferGatherRatePerSeconds;
		Engine.GetGUIObjectByName("resource[" + r + "]_count").caption = Math.floor(viewedPlayerState.resourceCounts[res]) + " + " + averageResourceGatherRate + "/" + resourceBufferGatherRatePerSeconds + "s";
	}
}
