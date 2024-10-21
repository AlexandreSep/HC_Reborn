SkirmishReplacer.prototype.ReplaceEntitiesHyrule = function(replacement, rotation)
{
    let cmpPlots = Engine.QueryInterface(replacement, IID_Plots);
    if (!cmpPlots)
		return;
    var cmpCurOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
	
	cmpPlots.SpawnPlots(rotation, cmpCurOwnership.GetOwner());
};
