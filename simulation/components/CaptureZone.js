function CaptureZone() {}

CaptureZone.prototype.Schema =
	"<a:help>Specifies a radius around an entity that allows other players to capture it</a:help>" +
	"<a:example>" +
		"<RadiusMax>100</RadiusMax>" +
		"<CapturePointsNeeded>5</CapturePointsNeeded>" +
	"</a:example>" +
	"<element name='RadiusMax' a:help='The radius of the circle around the entity'>" +
		"<data type='decimal'/>" +
	"</element>" +
	"<element name='CapturePointsNeeded' a:help='How long it takes to capture the entity in seconds'>" +
		"<data type='decimal'/>" +
	"</element>" + 
    "<optional>" +
        "<element name='Permanent' a:help='Some capture zones like ruins should not turn neutral after the owner leaves'>" +
            "<data type='boolean'/>" +
        "</element>" + 
    "</optional>" + 
    "<optional>" +
        "<element name='ProbeInterval' a:help='The game checks each X seconds for entities in the capture zone'>" +
            "<data type='decimal'/>" +
        "</element>" + 
    "</optional>";

CaptureZone.prototype.Init = function()
{
    this.playersInCaptureZone = new Set();
    this.playerWithCapturePoints = 0;
    this.capturePointsForPlayer = 0;
    if (this.template.ProbeInterval){
        this.probeInterval = this.template.ProbeInterval;
    } else {
        this.probeInterval = 1000;
    }
    
    this.radiusMax = this.template.RadiusMax;
    this.capturePointsNeeded = this.template.CapturePointsNeeded;
    this.permanent = this.template.Permanent;
    
    // List of all players that can capture an entity. It shall be all players except Gaia
    this.players = [1,2,3,4,5,6,7,8,9];
    
    let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
    this.timer = cmpTimer.SetInterval(this.entity, IID_CaptureZone, "CheckEntitiesInCaptureZone", 0, this.probeInterval, null);
    
};

CaptureZone.prototype.CheckEntitiesInCaptureZone = function()
{
    var cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    
    let currentEntitiesInCaptureZone = cmpRangeManager.ExecuteQuery(this.entity, 0, this.radiusMax, this.players, 0);
    
    let currentPlayersInCaptureZone = new Set();
    for (let entity of currentEntitiesInCaptureZone){
        let cmpPlayer = QueryOwnerInterface(entity); 
        currentPlayersInCaptureZone.add(cmpPlayer.playerID);
    }

    this.UpdateTimeSinglePlayerInCaptureZoneIfAllowed (currentPlayersInCaptureZone);
    
    this.playersInCaptureZone = currentPlayersInCaptureZone;
    
    if (this.capturePointsForPlayer == 0){
        this.MakeCaptureZoneNeutralIfAllowed();
    }
    
    if (this.capturePointsForPlayer >= this.capturePointsNeeded){
        this.CaptureEntityForPlayer();
    }
}

CaptureZone.prototype.UpdateTimeSinglePlayerInCaptureZoneIfAllowed = function (currentPlayersInCaptureZone)
{
    if (this.permanent){
        let currentOwner = QueryOwnerInterface(this.entity).playerID;
        if ( (currentOwner != 0) ) {
            if (this.NoneOrOnlyGaiaUnitsInCapturezone(currentPlayersInCaptureZone) ){
                return;
            }
        }
    }
    
    this.UpdateTimeSinglePlayerInCaptureZone (currentPlayersInCaptureZone);
}

CaptureZone.prototype.UpdateTimeSinglePlayerInCaptureZone = function (currentPlayersInCaptureZone)
{
    if (currentPlayersInCaptureZone.size != 1){
        if (this.capturePointsForPlayer > 0){ // Reduce by one point if there are more players in the capture zone
            this.capturePointsForPlayer = this.capturePointsForPlayer - 1;
        }
    } else { // If only one player, add one capture point
        let iterator = this.playersInCaptureZone.values();
        let first = iterator.next();
        let playerInCaptureZone = first.value;
        
        let otherPlayerHasMostCapturePoints = (this.playerWithCapturePoints != playerInCaptureZone && this.playerWithCapturePoints != 0);
        let gaiaPlayerHasMostCapturePoints = (this.playerWithCapturePoints == 0);
        let thisPlayerHasMostCapturePoints = (this.playerWithCapturePoints == playerInCaptureZone);
        
        if (otherPlayerHasMostCapturePoints){
            this.capturePointsForPlayer = this.capturePointsForPlayer - 1;
        }
        
        if (gaiaPlayerHasMostCapturePoints){
            this.capturePointsForPlayer = this.capturePointsForPlayer + 1;
            this.playerWithCapturePoints = playerInCaptureZone;
        }
        
        if (thisPlayerHasMostCapturePoints){
            if (this.capturePointsForPlayer < this.capturePointsNeeded){
                this.capturePointsForPlayer = this.capturePointsForPlayer + 1;
            }
        }
    }
    
    let cmpStatusBars = Engine.QueryInterface(this.entity, IID_StatusBars);
    cmpStatusBars.UpdateCaptureZoneBar();
}

CaptureZone.prototype.CaptureEntityForPlayer = function ()
{
    if (this.playersInCaptureZone.size == 1){
        let iterator = this.playersInCaptureZone.values();
        let first = iterator.next();
        let playerToCaptureEntity = first.value;
        // Do not change owner if we already own the entity
        let currentOwner = QueryOwnerInterface(this.entity);
        if (currentOwner == playerToCaptureEntity){
            return;
        }
        
        let cmpOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
        cmpOwnership.SetOwner(playerToCaptureEntity);
    }
}

CaptureZone.prototype.MakeCaptureZoneNeutralIfAllowed = function ()
{
    let cmpUpgrade = Engine.QueryInterface(this.entity, IID_Upgrade);
    if (cmpUpgrade && cmpUpgrade.IsUpgrading()){
        return;
    }

    // That code tells the battalion UI to remove the now neutral entity from a players battalionstructure UI
    // Without it, a capture zone that became neutral would stay in the former owner's battalion UI.
    let cmpBattalion = Engine.QueryInterface(this.entity, IID_Battalion);
    let battalionID = cmpBattalion.ownBattalionID;
    let cmpPlayer = QueryOwnerInterface(this.entity);
    var cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
	cmpGUIInterface.OnBattalionUpdate({ "delete": true, "id": battalionID, "player": cmpPlayer.playerID });
    
    this.playerWithCapturePoints = 0;
    this.CaptureEntityGaia();
}

CaptureZone.prototype.CaptureEntityGaia = function ()
{
    let currentOwner = QueryOwnerInterface(this.entity);
    if (currentOwner.playerID == 0){
        return;
    }
    let cmpOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
    cmpOwnership.SetOwner(0);
}

CaptureZone.prototype.NoneOrOnlyGaiaUnitsInCapturezone = function (currentPlayersInCaptureZone)
{
    if (currentPlayersInCaptureZone.size == 0){
        return true;
    }
    
    if (currentPlayersInCaptureZone.size == 1){
        let iterator = currentPlayersInCaptureZone.values();
        let first = iterator.next();
        let value = first.value;
        if (value == 0){
            return true
        }
    }

    return false;
}

CaptureZone.prototype.GetCaptureRate = function ()
{
    return (this.capturePointsForPlayer/this.capturePointsNeeded);
}

CaptureZone.prototype.GetCapturePointsNeeded = function ()
{
    return this.capturePointsNeeded;
}

CaptureZone.prototype.GetPlayerWithCapturePoints = function ()
{
    return this.playerWithCapturePoints;
}

Engine.RegisterComponentType(IID_CaptureZone, "CaptureZone", CaptureZone);
