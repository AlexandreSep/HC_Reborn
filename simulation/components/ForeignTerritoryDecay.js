function ForeignTerritoryDecay() {}

ForeignTerritoryDecay.prototype.Schema =
	"<element name='HpToSubtract' a:help='Amount of HP that shall be reduced per tick'>" +
		"<choice><ref name='positiveDecimal'/></choice>" +
	"</element>" +
	"<element name='TickRate' a:help='Tock rate in seconds'>" +
		"<choice><ref name='nonNegativeDecimal'/></choice>" +
	"</element>";

ForeignTerritoryDecay.prototype.Init = function ()
{
    this.decayTimerID = undefined;
    
    this.tickRate = this.template.TickRate*1000;
    this.hptoSubtract = this.template.HpToSubtract;
    
}

ForeignTerritoryDecay.prototype.OnTerritoriesChanged = function (msg)
{
    var cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	var pos = cmpPosition.GetPosition2D();
	
	var cmpTerritoryManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TerritoryManager);
	var tileOwner = cmpTerritoryManager.GetOwner(pos.x, pos.y);
	var isConnected = !cmpTerritoryManager.IsTerritoryBlinking(pos.x, pos.y);
	
	var cmpPlayer = QueryOwnerInterface(this.entity, IID_Player);
	let playerID = cmpPlayer.GetPlayerID();
	
	
	warn("tileOwner: " + JSON.stringify(tileOwner));
	warn("isConnected: " + JSON.stringify(isConnected));
	
	if(tileOwner != playerID){
		warn("Need to start decay: " + this.entity);
		
        
		
		let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
		this.decayTimerID = cmpTimer.SetInterval(this.entity, IID_ForeignTerritoryDecay, "ReduceHealth", 100, this.tickRate, null);
	} else {
		warn("Need to stop decay: " + this.entity);
        
        if (!this.decayTimerID){
            return;
        }
		let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
		cmpTimer.CancelTimer(this.decayTimerID);
        
        this.decayTimerID = undefined;
        
	}
}

ForeignTerritoryDecay.prototype.ReduceHealth = function()
{
	let cmpHealth = Engine.QueryInterface(this.entity, IID_Health);
	cmpHealth.Reduce(this.hptoSubtract);
}

Engine.RegisterComponentType(IID_ForeignTerritoryDecay, "ForeignTerritoryDecay", ForeignTerritoryDecay);

