const VIS_HIDDEN = 0;
const VIS_FOGGED = 1;
const VIS_VISIBLE = 2;

function Visibility() {}

Visibility.prototype.Schema =
    //HC-code
    "<optional>" +
        "<element name='CanSpotStealth'>" +
            "<interleave>" +
                "<element name='MinRange' a:help='The min range this unit can spot stealth'><ref name='nonNegativeDecimal'/></element>" +
                "<element name='MaxRange' a:help='The max range this unit can spot stealth'><data type='positiveInteger'/></element>" +
            "</interleave>" +
        "</element>" +
    "</optional>" +
    "<optional>" +
        "<element name='Camouflage'>" + 
            "<interleave>" +
                "<element name='ActivateDelay' a:help='The delay before camouflage is activated'><ref name='nonNegativeDecimal'/></element>" +
                "<element name='PostDelay' a:help='The delay before camouflage state is de-activated'><ref name='nonNegativeDecimal'/></element>" +
            "</interleave>" +
        "</element>" +
    "</optional>" +
    "<optional>" +
        "<element name='Stealth'>" +
            "<interleave>" +        
                "<element name='RevealOnAttackDelay' a:help='The delay before the stealth state is reset to true'><data type='integer'/></element>" +
            "</interleave>" +          
        "</element>" +
    "</optional>" +
    //HC-end
	"<element name='RetainInFog'>" +
		"<data type='boolean'/>" +
	"</element>" +
	"<element name='AlwaysVisible'>" +
		"<data type='boolean'/>" +
	"</element>" +
	"<element name='Corpse'>" +
		"<data type='boolean'/>" +
	"</element>" +
	"<element name='Preview'>" +
		"<data type='boolean'/>" +
	"</element>";

Visibility.prototype.Init = function()
{
	this.retainInFog = this.template.RetainInFog == "true";
	this.alwaysVisible = this.template.AlwaysVisible == "true";
	this.corpse = this.template.Corpse == "true";
	this.preview = this.template.Preview == "true";

	this.activated = false;

	if (this.preview || this.corpse)
        this.SetActivated(true);

    //HC-code
    this.hasStealth = false;
    let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
    cmpTimer.SetTimeout(this.entity, IID_Visibility, "InitStealth", 200, {});
};

//HC-code methods related to stealth
Visibility.prototype.InitStealth = function ()
{
    let stealthTemp = this.template.Stealth;
    let camouflageTemp = this.template.Camouflage;
    if (this.corpse == false && this.preview == false) {
        if (stealthTemp || camouflageTemp) // general invisibility data
        {
            this.hasStealth = true;
            this.isSpotted = false;
            this.stealthTimer = undefined;
            this.stealthTimerState = true;

            if (stealthTemp) { // stealth specific data
                if (stealthTemp.RevealOnAttackDelay != -1)
                    this.revealOnAttackDelay = +stealthTemp.RevealOnAttackDelay;
            }
            else // camouflage specific data
            {
                this.CamoActivateDelay = +camouflageTemp.ActivateDelay;
                this.CamoPostDelay = +camouflageTemp.PostDelay;
            }

            // abbreviated version of SetStealthState because we dont want to interact with 'IsIdle' at initialization
            let cmpUnitAI = Engine.QueryInterface(this.entity, IID_UnitAI);
            if (cmpUnitAI == undefined) // in the case this unit has been deleted, return 
                return;

            this.stealthed = true;
            this.SetActivated(true); //turn the custom script function on

            // Reset status bars for this entity
            let cmpStatusBars = Engine.QueryInterface(this.entity, IID_StatusBars);
            cmpStatusBars.RegenerateSprites();
        }
    }

    if (this.template.CanSpotStealth && this.corpse == false && this.preview == false) {
        this.minSpotRange = +this.template.CanSpotStealth.MinRange;
        this.maxSpotRange = +this.template.CanSpotStealth.MaxRange;
        let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
        cmpTimer.SetInterval(this.entity, IID_Visibility, "SpotEnemyUnits", 400, 400); // Attempt to spot stealthed enemy units twice a second
        this.spottedEntities = new Map();
    }
}

Visibility.prototype.CanSetNewStealthTimer = function (cmpTimer, newState)
{
    // cancel the stealthTimer if another timer has already been set before to prevent multiple timers from running and breaking the status changes
    // Also, if the upcoming timer is already going to the opposite of the current this.stealthed, don't reset the timer
    if (this.stealthTimer == undefined)
        return true; // no stealthTimer set, return true to indicate a new one can be called
    else
    {
        if (this.stealthTimerState != newState) // dont reset if the current timer state is the same as the new one
        {
            cmpTimer.CancelTimer(this.stealthTimer);
            this.stealthTimer = undefined;
            return true; // reset stealthTimer, return true to indicate a new one can be called
        }
        return false; // A stealthTimer is already active and carrying out a useful operation
    }  
};

Visibility.prototype.IsStealthed = function ()
{
    if (this.hasStealth == true)
        return this.stealthed;
    else
        return false;
};

/**
 * Sets whether this unit is in stealth mode or not
 */
Visibility.prototype.SetStealthState = function (status)
{
    if(this.stealthed == status) // This entity already has this status, no need to set that again
        return;

    let cmpUnitAI = Engine.QueryInterface(this.entity, IID_UnitAI);
    if (cmpUnitAI == undefined) // in the case this unit has been deleted, return 
        return;

    if (cmpUnitAI.IsIdle() == true) // if this entity is not idle, there is no need for a reset walk and it would intervene with the current command as well
    {
        // Stationary/Idle units are not updated visually by the GetVisibility method, so use a reset walk
        cmpUnitAI.ignoreIdleCall = true; // this walk order should not update the idle status of this entity
        let cmpPos = Engine.QueryInterface(this.entity, IID_Position);
        if (cmpPos.IsInWorld()) {
            let pos = cmpPos.GetPosition2D();
            Engine.QueryInterface(this.entity, IID_UnitAI).Walk(pos.x + 0.00001, pos.y + 0.00001, false);
        }
    }
    this.stealthed = status;
    this.SetActivated(status); //turn the custom script function on

    // Reset status bars for this entity
    let cmpStatusBars = Engine.QueryInterface(this.entity, IID_StatusBars);
    cmpStatusBars.RegenerateSprites();
};

/**
 * Occurs whenever an attack has been performed by this stealthed entity
 */
Visibility.prototype.CustomOnAttack = function () {
    if (this.revealOnAttackDelay != undefined)
    {
        // the attack message always goes back to false instantly, and then to true after the delay
        let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
        if (this.stealthTimer != undefined)
        {
            cmpTimer.CancelTimer(this.stealthTimer);
            this.stealthTimer = undefined;
        }

        this.SetStealthState(false); // this entity should be revealed on attack, set to false
        this.stealthTimerState = true; // the upcoming state will be true
        this.stealthTimer = cmpTimer.SetTimeout(this.entity, IID_Visibility, "SetStealthState", this.revealOnAttackDelay, true); // reset stealth back to true after set time
    }
};

Visibility.prototype.OnUnitIdleChanged = function (msg) {
    // only run this for entities with camouflage
    if (this.CamoActivateDelay == undefined)
        return;

    let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
    if (this.CanSetNewStealthTimer(cmpTimer, msg.idle) == false) // Can't reset timer, dont set a new one yet
        return;

    // if this camouflage unit just became idle, set stealth to true with the provided delay
    if (msg.idle == true) {
        this.stealthTimerState = true; // the upcoming state will be true
        if (this.CamoActivateDelay == 0)
            this.SetStealthState(true);
        else
            this.stealthTimer = cmpTimer.SetTimeout(this.entity, IID_Visibility, "SetStealthState", this.CamoActivateDelay, true);
    }
    else // if this camouflage unit is no longer idle, set stealth to false with the provided delay
    {
        this.stealthTimerState = false; // the upcoming state will be false
        if (this.CamoPostDelay == 0)
            this.SetStealthState(false);
        else
            this.stealthTimer = cmpTimer.SetTimeout(this.entity, IID_Visibility, "SetStealthState", this.CamoPostDelay, false);
    }
};

Visibility.prototype.SpotEnemyUnits = function () {
    //set the previously spotted units to not be spotted at the start of the check
    for (let CmpVisibility of this.spottedEntities.values())
        CmpVisibility.isSpotted = false;

    let cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    let cmpPlayer = QueryOwnerInterface(this.entity);
    if (!cmpPlayer)
        return;

    let enemyPlayers = cmpPlayer.GetEnemies(); // only check for enemy units

    // get the nearby enemy entities within the specified range
    let nearbyEnemies = cmpRangeManager.ExecuteQuery(this.entity, this.minSpotRange, this.maxSpotRange, enemyPlayers, IID_Resistance);
    for (let ent of nearbyEnemies) {
        let cmpVisibility = this.spottedEntities.get(ent);
        if (cmpVisibility != undefined) // if this found entity is already spotted, 
        {
            cmpVisibility.isSpotted = true; //set to true to nullify the check and continue
            continue;
        }

        cmpVisibility = Engine.QueryInterface(ent, IID_Visibility);
        if (cmpVisibility.hasStealth == true && Engine.QueryInterface(this.entity, IID_Resistance).IsInvulnerable() == false) // if not spotted yet, check if it has stealth first
        {
            this.spottedEntities.set(ent, cmpVisibility); // if so, add to spotted list

            if (cmpPlayer.allSpottedEntities[ent] == undefined) // if not present yet, 
                cmpPlayer.allSpottedEntities[ent] = []; // also add this to the global spotted list

            cmpPlayer.allSpottedEntities[ent].push(this.entity); // this [ent] has been spotted by this spotter AKA "this.entity"
            cmpVisibility.SetStealthState(false); // set its current stealth state to false
            cmpVisibility.isSpotted = true; // let this entity know it was spotted, otherwise it will instantly reset in the code below
            ////error(this.entity + " set unit as spotted " + ent);
        }
    }

    // any entities that were previously spotted, but werent found by the spotters query in this iteration
    for (let key of this.spottedEntities.keys()) {
        let cmpVisibility = this.spottedEntities.get(key);
        if (cmpVisibility.isSpotted == false) {
            let entitySpotters = cmpPlayer.allSpottedEntities;
            let length = entitySpotters[key].length; // the number of spotters that have spotted this particular entity
            for (let i = 0; i < length; i++) {
                if (entitySpotters[key][i] == this.entity) // find this spotter among the list of spotters that have previously seen this entity
                {
                    entitySpotters[key].splice(i, 1);
                    ////error(this.entity + " lost spotted unit " + key);
                    break;
                }
            }
            this.spottedEntities.delete(key); // this spotter has lost this particular entity

            // If this unit is no longer being spotted by anything globally, delete it from the global list and set stealthed back to true
            if (length < 2) {
                cmpVisibility.SetStealthState(true);
                delete entitySpotters[key];
                ////error(this.entity + " reset spotted unit " + key);
            }
        }
    }
}
//HC-end End of the HC related Stealth methods

/**
 * Sets the range manager scriptedVisibility flag for this entity.
 */
Visibility.prototype.SetActivated = function(status)
{
	let cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
	cmpRangeManager.ActivateScriptedVisibility(this.entity, status);

	this.activated = status;
};

/**
 * This function is a fallback for some entities whose visibility status
 * cannot be cached by the range manager (especially local entities like previews).
 * Calling the scripts is expensive, so only call it if really needed.
 */
Visibility.prototype.IsActivated = function()
{
	return this.activated;
};

/**
 * This function is called if the range manager scriptedVisibility flag is set to true for this entity.
 * If so, the return value supersedes the visibility computed by the range manager.
 * isVisible: true if the entity is in the vision range of a unit, false otherwise
 * isExplored: true if the entity is in explored territory, false otherwise
 */
Visibility.prototype.GetVisibility = function(player, isVisible, isExplored)
{
    //HC-code
    //if this unit is stealthed, set it to hidden for all players except its own owner of course
    if (this.hasStealth == true && this.stealthed == true && Engine.QueryInterface(this.entity, IID_Ownership).GetOwner() != player) {
        return VIS_HIDDEN;
    }
    //HC-end

	if (this.preview)
	{
		// For the owner only, mock the "RetainInFog" behavior
		let cmpOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
		if (cmpOwnership && cmpOwnership.GetOwner() == player && isExplored)
			return isVisible ? VIS_VISIBLE : VIS_FOGGED;

		// For others, hide the preview
		return VIS_HIDDEN;
	}
	else if (this.corpse)
	{
		// For the owner only, mock the "RetainInFog" behavior
		let cmpOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
		if (cmpOwnership && cmpOwnership.GetOwner() == player && isExplored)
			return isVisible ? VIS_VISIBLE : VIS_FOGGED;

		// For others, regular displaying
		return isVisible ? VIS_VISIBLE : VIS_HIDDEN;
	}

	return VIS_VISIBLE;
};

Visibility.prototype.GetRetainInFog = function()
{
	return this.retainInFog;
};

Visibility.prototype.GetAlwaysVisible = function()
{
	return this.alwaysVisible;
};

Engine.RegisterComponentType(IID_Visibility, "Visibility", Visibility);
