ResourceSupply.prototype.IndicateResourceDrain = function(visualEffectDuration)
{
	let cmpVisual = Engine.QueryInterface(this.entity, IID_Visual);
	if (!cmpVisual)
		return;
	
	cmpVisual.SetVariant("menhir", "draining");

	var cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
	cmpTimer.SetTimeout(this.entity, IID_ResourceSupply, "RemoveResourceDrainIndication", visualEffectDuration, undefined);
}

ResourceSupply.prototype.RemoveResourceDrainIndication = function()
{
	let cmpVisual = Engine.QueryInterface(this.entity, IID_Visual);
	if (!cmpVisual)
		return;
	
	cmpVisual.SetVariant("menhir", "not-draining");
}