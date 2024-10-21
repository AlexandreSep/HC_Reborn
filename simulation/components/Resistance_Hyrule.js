Resistance.prototype.InitHyrule = function()
{
    this.isStunned = false;

    // knockback variables
    this.knockbackTimer = undefined; // the knockback timer currently in use
    this.knockbackIteration = 0; // the current knockback iteration
    this.runVerticalOnly = false; // will be set to true when collision takes place in the air to stop the horizontal but continue the vertical aspect of the knockback
    this.stunData = null; // will hold the initial stundata from the knockback if present
    this.knockedDead = false; // set true if a blow killed this entity
    this.registerData = {};
}

/**
 *
 * @param {*} data - Special data passed by the timer.
 * @param {*} lateness - How late this function was called.
 */
Resistance.prototype.ResetKnockback = function (data, lateness)
{
    this.SetInvulnerability(false);
    this.knockbackTimer = undefined;
    this.knockbackIteration = 0;
    this.runVerticalOnly = false;
    this.stunData = null;
}

Resistance.prototype.StunEntity = function (entity, miliseconds, playAnimation = true)
{
    if (this.isStunned == true) // if the target is already stunned dont try to stun it again
        return;

    this.isStunned = true; // set the target to stunned state

    let cmpUnitMotion = Engine.QueryInterface(entity, IID_UnitMotion);
    if (!cmpUnitMotion)
        return;

    cmpUnitMotion.SetSpeedMultiplier(+0.001); // the unit cant move when its stunned

    if (playAnimation == true) {
        let visualCmp = Engine.QueryInterface(entity, IID_Visual);
        visualCmp.SelectAnimation("death", false, 0.1);
    }
    let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
    let data = {};
    data.timer = cmpTimer.SetTimeout(entity, IID_Resistance, "ResetStun", miliseconds, data); // reset the stun after given miliseconds
    this.stunData = data;
}

Resistance.prototype.ReStun = function (data, miliseconds) // a function meant to reinstigate the stun with new miliseconds (can only be used when another stun is already active)
{
    let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
    cmpTimer.CancelTimer(data.timer); // cancel the old timer
    data.timer = cmpTimer.SetTimeout(this.entity, IID_Resistance, "ResetStun", miliseconds, data); // reinstigate a new timer with set miliseconds
    this.stunData = data; // return the data with the new timer in it
}

Resistance.prototype.ResetStun = function (data, lateness)
{
    this.isStunned = false;
    let cmpUnitMotion = Engine.QueryInterface(this.entity, IID_UnitMotion);
    if (!cmpUnitMotion)
        return;

    let cmpUnitAI = Engine.QueryInterface(this.entity, IID_UnitAI);
    if (!cmpUnitAI)
        return;

    let cmpVisual = Engine.QueryInterface(this.entity, IID_Visual);
    if (!cmpVisual)
        return;

    cmpVisual.SelectAnimation("idle", false, 1.0); // reset to idle first

    cmpUnitMotion.SetSpeedMultiplier(+1); // reset speed multiplier to 1
    let cmpPos = Engine.QueryInterface(this.entity, IID_Position);
    let pos = cmpPos.GetPosition2D();
    cmpUnitAI.Walk(pos.x + +1, pos.y, false); // for now, run a generic move command after to reset the orientation, TODO: make the entity attack the previous entity if it exists
}

Resistance.prototype.InitKnockback = function (data, lateness)
{
    let visualCmp = Engine.QueryInterface(this.entity, IID_Visual);
    visualCmp.SelectAnimation("flail", false, 25.0);
    this.SetInvulnerability(true);

    // calculate stun to last the runtime + 1000 for the recover animation (reset stun if the knockback is canceled earlier)
    // 1000 seems to be the exact sweet spot atm so it doesnt reanimate the recover animation twice
    this.StunEntity(this.entity, data.runtime + +1000, false); 

    let rand = (randFloat(0, 1) * 100);
    if (rand > 5)
        PlaySound("knockback", this.entity);
    else
        PlaySound("wilhelm", this.entity);
}

Resistance.prototype.CancelKnockback = function (idleAnimation = false)
{
    if (this.knockedDead == true) // unit has finished its knockback sequence and should be killed now
    {
        let cmpHealth = Engine.QueryInterface(this.entity, IID_Health);
        cmpHealth.Kill();
        //let cmpDamage = Engine.QueryInterface(SYSTEM_ENTITY, IID_Damage);

        //if (this.registerData.attacker != undefined)
        //    cmpDamage.RegisterDamage(this.registerData.attacker, this.entity, this.registerData.attackerOwner, this.registerData.damage);

        //this.registerData = {};
        return;
    }

    let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
    cmpTimer.CancelTimer(this.knockbackTimer);
    cmpTimer.SetTimeout(this.entity, IID_Resistance, "ResetKnockback", 1000);

    let visualCmp = Engine.QueryInterface(this.entity, IID_Visual);
    if (idleAnimation == true)
        visualCmp.SelectAnimation("death", false, 0.1);
    else
        visualCmp.SelectAnimation("recover", true, 25.0);
}

// The GetEntitiesBlockingConstruction function only checks for mobile entities and the one that looks for static entities isnt open for use inside the javascript
// Therefore the static buildings themselves will have to be found first, from there check if any units have collided with that building instead
Resistance.prototype.HasCollidedWithStructure = function ()
{
    let cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    let nearbyEnts = cmpRangeManager.ExecuteQuery(this.entity, 0, 50, Engine.QueryInterface(SYSTEM_ENTITY, IID_PlayerManager).GetAllPlayers(), IID_Resistance);
    for (let entity of nearbyEnts)
    {
        let cmpIdentity = Engine.QueryInterface(entity, IID_Identity);
        if (!cmpIdentity.HasClass("Structure")) // ignore non structures
            continue;

        let cmpObstruction = Engine.QueryInterface(entity, IID_Obstruction);
        let collisions = cmpObstruction.GetEntitiesBlockingConstruction();

        for (let collisionEntity of collisions)
        {
            if (collisionEntity == this.entity)
                return true; // this entity has collided with this structure
        }
    }
    return false;
}

Resistance.prototype.ExecuteAirborneCollision = function (verticalData)
{
    this.runVerticalOnly = true;
    let newStunTime = ((verticalData.finalIteration - this.knockbackIteration) * 200) + 1000; // re stun the target for the iteration time left + 1 extra second
    this.ReStun(this.stunData, newStunTime); // stun the knocked entity
}

Resistance.prototype.ExecuteGroundCollision = function ()
{
    this.CancelKnockback(true); // call the slowed down death animation type for horizontal collision
    this.ReStun(this.stunData, 1000); // cancel the initial runtime stun and set a new stun that will last 1 second
}

Resistance.prototype.InterpolateKnockback = function (data, lateness)
{
    this.knockbackIteration += 1; // increment the knockbackIteration
    let cmpObstruction = Engine.QueryInterface(this.entity, IID_Obstruction);
    let collisions = cmpObstruction.GetEntitiesBlockingConstruction();
    let verticalData = data.verticalData;

    // TODO: make the stun time based on a size class or a weight component, also add impact damage based on size and/or weight
    if (collisions.length > 0 && this.runVerticalOnly == false) // stun units if they collide
    {
        if (verticalData != null)
        {
            for (let collisionEntity of collisions)
            {
                let cmpPos = Engine.QueryInterface(this.entity, IID_Position);
                let cmpPosCollision = Engine.QueryInterface(collisionEntity, IID_Position);
                let difference = cmpPos.GetPosition().y - cmpPosCollision.GetPosition().y;
                if (difference < 25 && difference > -25) // collision took place in the air
                {
                    this.ExecuteAirborneCollision(verticalData);
                    break;
                }
            }
        }
        else
        {
            for (let collisionEntity of collisions)
            {
                let cmpIdentity = Engine.QueryInterface(collisionEntity, IID_Identity);
                if (cmpIdentity && cmpIdentity.HasClass("Unit"))
                    this.StunEntity(collisionEntity, 2000, false); // stun any unit that collided with the knocked entity
            }

            this.ExecuteGroundCollision();
            return;
        }
    }

    // check if there was collision with structures in the area as well
    if (this.HasCollidedWithStructure() == true && this.runVerticalOnly == false)
    {
        if (verticalData != null)
            this.ExecuteAirborneCollision(verticalData);
        else
        {
            this.ExecuteGroundCollision();
            return;
        }
    }

    if (this.knockbackIteration > data.iterationCount) // if the runtime has ended cancel the knockback
    {
        this.CancelKnockback(); // no need to re-orientate, this will be done by the stun anyway
        return;
    }

    let cmpPos = Engine.QueryInterface(this.entity, IID_Position);
    if (this.runVerticalOnly == false) // ignore the horizontal functionality if there was collision in the air, causing units to continue their vertical movement only
    {
        // cache the data used in the iteration loop
        let newPosX = data.startPos.x;
        let newPosZ = data.startPos.y;
        let deltaX = data.deltaX;
        let deltaZ = data.deltaZ;
        let deltaSpeedScale = data.deltaSpeedScale;

        for (let i = 0; i < this.knockbackIteration; i++) // has to be done in an iteration loop because every iteration has its own scaledDelta value
        {
            let scaledDelta = +1.9 - (deltaSpeedScale * i); // get the percentaged modifier between 190 and 10% percent based upon the current iteration
            newPosX += scaledDelta * deltaX; // scale X by the current iterations scaledDelta
            newPosZ += scaledDelta * deltaZ; // scale Z by the current iterations scaledDelta
        }

        cmpPos.MoveTo(newPosX, newPosZ); // move the target to this new location
    }

    if (verticalData != null) // if there is vertical knockback run that calculation as well
        this.VerticalKnockback(verticalData, cmpPos);
}

Resistance.prototype.VerticalKnockback = function (data, cmpPos)
{
    let deltaY = ((this.knockbackIteration * data.scaledGravity) + data.strength) * data.repeatModifier; // get the delta Y which is the y distance traveled within the repeat time frame
	let cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	if (!cmpPosition)
	    return;
	let pos = cmpPosition.GetPosition();
	let height = pos.y + deltaY;
	
    if (this.knockbackIteration >= data.finalIteration) // if this is the last iteration of this knockback, clamp the unit back to the ground
    {
        let cmpTerrain = Engine.QueryInterface(SYSTEM_ENTITY, IID_Terrain);
        let cmpWaterManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_WaterManager);
        let ground = Math.max(cmpTerrain.GetGroundLevel(pos.x, pos.z), cmpWaterManager.GetWaterLevel(pos.x, pos.z));

        let cmpHealth = Engine.QueryInterface(this.entity, IID_Health);
        let fallDamage = this.knockbackIteration * 0.003; // for every iteration add 0.3% fall damage
        if (fallDamage > 0.05) // max of 5% fall damage
            fallDamage = 0.05;

        fallDamage = cmpHealth.GetMaxHitpoints() * fallDamage;

        cmpHealth.Reduce(fallDamage);

        this.CancelKnockback();
        cmpPosition.SetHeightFixed(ground); // cancel and clamp to ground
    }
    else
        cmpPosition.SetHeightFixed(height); // in any other iteration simply set the altitude to the calculated height
}

Resistance.prototype.SpawnImpactUnits = function (EntityImpact, pos, chance, AttackOwner) {
    // calculate random occurence chance based on parameter
    let rand = (randFloat(0, 1) * 100);
    if (rand > chance)
        return;

    // get random spawn number based on parameters
    let randSpawns = randIntInclusive(+EntityImpact.spawnNumberMin, +EntityImpact.spawnNumberMax);

    //Spawn units
    for (let i = 0; i < randSpawns; i++)
    {
        var spawnedUnit = Engine.AddEntity(EntityImpact.template);

        // A unit spawned that way needs to be marked as free and shall not take up a slot in the battalion count
        let cmpHealth = Engine.QueryInterface(spawnedUnit, IID_Health);
        cmpHealth.freeUnit = true;

        // set spawned unit location
        var spawnedUnitPosCmp = Engine.QueryInterface(spawnedUnit, IID_Position);
        spawnedUnitPosCmp.JumpTo(pos.x, pos.y);

        // set spawned unit rotation
        spawnedUnitPosCmp.SetYRotation(0);
        spawnedUnitPosCmp.SetXZRotation(0, 0);

        // set spawned unit ownership
        var spawnedUnitOwnershipCmp = Engine.QueryInterface(spawnedUnit, IID_Ownership);
        let ownerID = EntityImpact.ownerID;
        if (ownerID != undefined)
            spawnedUnitOwnershipCmp.SetOwner(+ownerID);
        else
            spawnedUnitOwnershipCmp.SetOwner(AttackOwner);

        let cmpBattalion = Engine.QueryInterface(spawnedUnit, IID_Battalion);
        if (cmpBattalion != undefined)
            QueryOwnerInterface(spawnedUnit).AddBattalion([spawnedUnit]);

        // play spawn animation if present
        var spawnedUnitVisualCmp = Engine.QueryInterface(spawnedUnit, IID_Visual);
        spawnedUnitVisualCmp.SelectAnimation("spawn", true, 1.0);

        //play sound if present
        PlaySound("spawn", spawnedUnit);
    }
}

Resistance.prototype.HasDodged = function (type)
{
    if (type != "Melee") //only run for melee attacks
        return false;

    let dodge = this.GetDodgeRating();
    if (dodge == 0)
        return false;

    let rand = (randFloat(0, 1) * 100);
    if (rand > dodge)
        return false;
    else
    {
        // play dodge animation if present
        //var VisualCmp = Engine.QueryInterface(this.entity, IID_Visual);
        //VisualCmp.SelectAnimation("dodge", true, 1.0);
        return true;
    }
}

Resistance.prototype.GetDodgeRating = function ()
{
    let rating = 0;
    let dodge = this.template.DodgeRating;
    if (dodge)
        rating = +dodge;

    let applyMods = ApplyValueModificationsToEntity("Resistance/DodgeRating", rating, this.entity);

    return applyMods;
}

Resistance.prototype.GetKnockbackResistance = function ()
{
    let rating = 0;
    let resistance = this.template.KnockbackResistance;
    if (resistance)
        rating = +resistance;

    let applyMods = ApplyValueModificationsToEntity("Resistance/KnockbackResistance", rating, this.entity);

    return applyMods;
}

Resistance.prototype.GetStunResistance = function ()
{
    let rating = 0;
    let resistance = this.template.StunResistance;
    if (resistance)
        rating = +resistance;

    let applyMods = ApplyValueModificationsToEntity("Resistance/StunResistance", rating, this.entity);

    return applyMods;
}
