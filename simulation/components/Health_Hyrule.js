
Health.prototype.InitHyrule = function()
{
    this.freeUnit = false;

    this.intervalSpawnHolderID = null; // the id of the entity that holds the interval spawn component for this particular entity
    this.garrisonSpawnHolderID = null; // the id of the entity that holds the garrison spawn component for this particular entity 
    let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
    cmpTimer.SetTimeout(this.entity, IID_Health, "SpawnOnIntervalInit", 1000); // call this as post init to prevent certain components being undefined at this time
    this.SpawnGarrisonInitTimer = cmpTimer.SetTimeout(this.entity, IID_Health, "SpawnGarrisonInit", 1000); // call this as post init to prevent certain components being undefined at this time

    if (this.template.TransformAfterCreation){
	let cmpFoundation = Engine.QueryInterface(this.entity, IID_Foundation)
	if (!cmpFoundation){
	    let timeToWaitUntilTransformation = ApplyValueModificationsToEntity("Health/TransformAfterCreation/TransformAfterSeconds", +this.template.TransformAfterCreation.TransformAfterSeconds, this.entity);
	    cmpTimer.SetTimeout(this.entity, IID_Health, "TransformThisEntityAndReplenishBattalion", timeToWaitUntilTransformation*1000);
	}
    }
}

Health.prototype.GetDeathblowAnimation = function (attacker)
{
    if (attacker == undefined)
        return undefined;  // if this entity was killed without an attacker (like pressing delete), return undefined

    let cmpUnitAI = Engine.QueryInterface(attacker, IID_UnitAI);
    if (!cmpUnitAI)
        return undefined;

    let data = cmpUnitAI.GetDeathblowData();
    if (data == undefined)
        return undefined; // there is no deathblow data specified for this attacker, return undefined

    // check all the target classes inside the deathblow data until a matching class is found
    let cmpIdentity = Engine.QueryInterface(this.entity, IID_Identity);
    for (let element of data)
    {
        for (let targetClass of element.targetClasses)
        {
            if (cmpIdentity.HasClass(targetClass))
            { // found a matching class
                let rand = randIntInclusive(+0, +100);
                if (rand > element.chance) // the chance provided for this animation class-set
                    return undefined; // random chance failed, return undefined

                // get a random animation from the batch of potential animations that can be played for this class-set
                let animationData = element["animationData"];
                let totalFrequency = 0;
                for (let data of animationData) 
                    totalFrequency += data.frequency; // get the total frequency first

                let frequencyValue = randIntExclusive(+0, +totalFrequency); // get a random value between 0 and the total frequency
                // keep decreasing the random value by all the lone frequencies until it has been exhausted
                for (let i = 0; i < animationData.length; i++)
                {
                    frequencyValue -= animationData[i].frequency;
                    if (frequencyValue <= 0)
                        return { "data": animationData[i], "counterData": element["counterAnimationData"][i] || undefined, "unitAI": cmpUnitAI }; //return the animationData within and the unitAI
                }                          
            }
        }
    }

    return undefined; // no matching kill animation found against this entity, return undefined
};

Health.prototype.SpawnEntitiesOnDeath = function () {
    // chance on spawning this entity based on component parameter
    let rand = (randFloat(0, 1) * 100);
    if (rand > ApplyValueModificationsToEntity("Health/SpawnMultipleEntitiesOnDeath/Chance", +this.template.SpawnMultipleEntitiesOnDeath.Chance, this.entity))
        return;

    // check if the entity is present in the map area
    var cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
    if (!cmpPosition.IsInWorld())
        return INVALID_ENTITY;

    // get random spawn number based on parameters
    let spawnNumberMin = ApplyValueModificationsToEntity("Health/SpawnMultipleEntitiesOnDeath/SpawnNumberMin", +this.template.SpawnMultipleEntitiesOnDeath.SpawnNumberMin, this.entity);
    let spawnNumberMax = ApplyValueModificationsToEntity("Health/SpawnMultipleEntitiesOnDeath/SpawnNumberMax", +this.template.SpawnMultipleEntitiesOnDeath.SpawnNumberMax, this.entity);
    let randSpawns = randIntInclusive(spawnNumberMin, spawnNumberMax);

    var cmpOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
    var pos = cmpPosition.GetPosition();
    var rot = cmpPosition.GetRotation();

    // Parameters needed for the battalion system
    let spawnBattalionSize = this.template.SpawnMultipleEntitiesOnDeath.BattalionSize;
    let donNotSetCustomBattalionSize = this.template.SpawnMultipleEntitiesOnDeath.DoNotSetCustomBattalionSize;
    let spawnInSameBattalion = this.template.SpawnMultipleEntitiesOnDeath.SameBattalion;
    let newUnitsConsumesBattalionSlots = this.template.SpawnMultipleEntitiesOnDeath.ConsumeBattalionSlots;
    let cmpPlayer = QueryOwnerInterface(this.entity); 

    if (spawnInSameBattalion){
	if (newUnitsConsumesBattalionSlots==false || newUnitsConsumesBattalionSlots == true){
	    warn("If a unit spawns in the same battalion you can not set ConsumeBattalionSlots. It will have the cost of its parent. If you want to change that, spawn the new units in their own battalion");
	}
	let cmpBattalion = Engine.QueryInterface(this.entity, IID_Battalion);
	let templateToSpawn = this.template.SpawnMultipleEntitiesOnDeath.Template;
	if (spawnBattalionSize){
	    cmpPlayer.AddUnitsToBattalion(cmpBattalion.ownBattalionID, randSpawns*spawnBattalionSize, true, true, templateToSpawn);
	} else {
	    cmpPlayer.AddUnitsToBattalion(cmpBattalion.ownBattalionID, randSpawns, true, true, templateToSpawn);
	}
	Engine.BroadcastMessage(MT_BattalionUpdate, { "data": cmpPlayer.GetBattalion(cmpBattalion.ownBattalionID), "id": cmpBattalion.ownBattalionID, "player": cmpPlayer.playerID });
	return;
    }
    
    for (let i = 0; i < randSpawns; i++) {
        // Create SpawnEntityOnDeath entity
        let spawnedEntity = Engine.AddEntity(this.template.SpawnMultipleEntitiesOnDeath.Template);
        let cmpSpawnedPosition = Engine.QueryInterface(spawnedEntity, IID_Position);
	
        cmpSpawnedPosition.JumpTo(pos.x, pos.z);
        cmpSpawnedPosition.SetYRotation(rot.y);
        cmpSpawnedPosition.SetXZRotation(rot.x, rot.z);

        var cmpSpawnedOwnership = Engine.QueryInterface(spawnedEntity, IID_Ownership);
        let ownerID = this.template.SpawnMultipleEntitiesOnDeath.OwnerID;
        if (ownerID != undefined)
        {
            if (cmpSpawnedOwnership)
                cmpSpawnedOwnership.SetOwner(+ownerID);
        }
        else
        {
            if (cmpOwnership && cmpSpawnedOwnership)
                cmpSpawnedOwnership.SetOwner(cmpOwnership.GetOwner());
        }

	// Make the newly spawned unit free, if the dying unit was free
        let cmpSpawnedHealth = Engine.QueryInterface(spawnedEntity, IID_Health);
        let cmpSpawnedCost = Engine.QueryInterface(spawnedEntity, IID_Cost);
	if (cmpSpawnedHealth){
	    if (!newUnitsConsumesBattalionSlots){
		cmpSpawnedHealth.freeUnit = true;
	    } else{
		cmpPlayer.AddPopulation(cmpSpawnedCost.GetBattalionSlots());
		cmpSpawnedHealth.freeUnit = false;
	    }
	}

	// Asign a new battalion ID to the newly created unit
        let cmpBattalion = Engine.QueryInterface(spawnedEntity, IID_Battalion);
	if (!spawnInSameBattalion){
	    if (cmpBattalion != undefined){
		QueryOwnerInterface(spawnedEntity).AddBattalion([spawnedEntity]);
	    }
	}

	// If the battalion changes owner we must update cmpPlayer. USed for Mad Dkus Scrubs for example
	let cmpPlayerNewEntity = QueryOwnerInterface(spawnedEntity);

	// Now add more units to that battalion if it contains more than one.
	// If no battalion size is specified, fill up the battalion according to the battalion template
	if (spawnBattalionSize){
	    cmpPlayerNewEntity.AddUnitsToBattalion(cmpBattalion.ownBattalionID, spawnBattalionSize-1, true);
	} else {
	    let unitTemplateBattalionSize = cmpBattalion.GetBattalionSize();
	    cmpPlayerNewEntity.AddUnitsToBattalion(cmpBattalion.ownBattalionID, unitTemplateBattalionSize-1, true);
	}

	// Unless specified otherwise, we make the specified battalion size the max battalion size of the new battalion
	if (!donNotSetCustomBattalionSize){
	    for(let entity of cmpPlayerNewEntity.GetBattalion(cmpBattalion.ownBattalionID)){
		let cmpBattalionEntity = Engine.QueryInterface(entity, IID_Battalion);
		cmpBattalionEntity.customBattalionSize = spawnBattalionSize;
	    }
	}

        // play spawn animation if present
        var spawnedUnitVisualCmp = Engine.QueryInterface(spawnedEntity, IID_Visual);
        spawnedUnitVisualCmp.SelectAnimation("spawn", true, 1.0);

        //play sound if present
        PlaySound("spawn", spawnedEntity);
	
	Engine.BroadcastMessage(MT_BattalionUpdate, { "data": cmpPlayerNewEntity.GetBattalion(cmpBattalion.ownBattalionID), "id": cmpBattalion.ownBattalionID, "player": cmpPlayerNewEntity.playerID });

    }
};

// init SpawnGarrison data for constructed entity
Health.prototype.SpawnGarrisonInit = function ()
{
    delete this.SpawnGarrisonInitTimer;
    if (!this.template.SpawnGarrison)
        return;

    let cmpFoundation = Engine.QueryInterface(this.entity, IID_Foundation);
    if (cmpFoundation) // no foundations plx
        return;

    this.spawnGarrisonInfo =
    {
        "template": this.template.SpawnGarrison.Template,                
        "spawnNumber": ApplyValueModificationsToEntity("Health/SpawnGarrison/SpawnNumber", +this.template.SpawnGarrison.SpawnNumber, this.entity),
        "linkedDestruction": this.template.SpawnGarrison.LinkedDestruction != "false"
    };

    //if (this.garrisonSpawnedEntities == undefined) // TODO: Add some section for upgrade checks if this entity were to be upgraded, currently only used for defensive structures
    this.garrisonSpawnedEntities = []; // the list that will hold the entities spawned by this entity

    if (Engine.QueryInterface(this.entity, IID_Identity).HasClass("Unit") == false)
        this.SpawnGarrisonUnits();
};

// SpawnGarrison function called whenever the tech has been researched
Health.prototype.SpawnGarrisonUnits = function ()
{
    if (this.spawnGarrisonInfo.spawnNumber == 0)
        return; // Garrison Spawn is still inactive, return

    for (let i = 0; i < this.spawnGarrisonInfo.spawnNumber; i++) // loop over the number of spawns 
    {
        let spawnedEntity = Engine.AddEntity(this.spawnGarrisonInfo.template);

        // make sure to set the intervalspawn holder before setting the ownership, to prevent the promotion checks to occur before the spawn holder has even been set properly
        this.garrisonSpawnedEntities.push(spawnedEntity); // add the newly spawned entity to the origins list
        let cmpSpawnedHealth = Engine.QueryInterface(spawnedEntity, IID_Health);
        cmpSpawnedHealth.garrisonSpawnHolderID = this.entity; // make sure to let the spawned entity know who created it

        cmpSpawnedHealth.freeUnit = true;	// Mark this unit as a "free" unit. So we don't need to subtract a unit from the battalion count if it dies

        var cmpSpawnedOwnership = Engine.QueryInterface(spawnedEntity, IID_Ownership);
        let cmpOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
        if (cmpOwnership && cmpSpawnedOwnership)
            cmpSpawnedOwnership.SetOwner(cmpOwnership.GetOwner());

        Engine.QueryInterface(spawnedEntity, IID_Resistance).SetInvulnerability(true); // Garrison Units are invulnerable and also can't be controlled
    }

    // Check actorseed parameter and apply if applicable
    let cmpBattalion = Engine.QueryInterface(this.garrisonSpawnedEntities[0], IID_Battalion);
    let actorSeed = -1;
    if (cmpBattalion.UseSameActorSeed() == true)
    {
        actorSeed = Engine.QueryInterface(this.garrisonSpawnedEntities[0], IID_Visual).GetActorSeed();
        for (let i = 1; i < this.garrisonSpawnedEntities.length; i++) {
            Engine.QueryInterface(this.garrisonSpawnedEntities[i], IID_Visual).SetActorSeed(actorSeed);
        }
    }
    // Putting into formation now is useless because garrisoning will remove them from it anyway
    QueryOwnerInterface(this.entity).AddBattalion(this.garrisonSpawnedEntities, actorSeed); // save this collection as a single battalion

    // Instantly Garrison this battalion into the holder turret
    for (let i = 0; i < this.garrisonSpawnedEntities.length; i++)
    {
        let cmpTurretable = Engine.QueryInterface(this.garrisonSpawnedEntities[i], IID_Turretable);
        if (cmpTurretable)
            cmpTurretable.OccupyTurret(this.entity, "", false); // ejectable = false
    }
};

Health.prototype.CheckGarrisonSpawnInvolvement = function ()
{
    //If this entity gets destroyed before the initialization has been set, cancel it to prevent units from turreting an empty husk
    if (this.SpawnGarrisonInitTimer != undefined)
    {
        Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer).CancelTimer(this.SpawnGarrisonInitTimer);
        delete this.SpawnGarrisonInitTimer;
        return; // we cancelled the init so there are no units to be killed, return
    }

    if (this.spawnGarrisonInfo == undefined) // if the holder itself is destroyed, kill all spawned entities connected to it unless linked destruction is off
        return;

    // for some reason, the garrisonSpawnedEntities automatically removes its elements after every Kill() call, so decrement from the top so it wont skip units in the list
    let linkedDestruction = this.spawnGarrisonInfo.linkedDestruction;
    for (let i = this.garrisonSpawnedEntities.length - 1; i >= 0; i--)
    {
        let ent = this.garrisonSpawnedEntities[i];
        let cmpHealth = Engine.QueryInterface(ent, IID_Health);
        if (!cmpHealth) 
            return; // if one of the entities is dead, they have all been deleted by accident, return

        cmpHealth.garrisonSpawnHolderID = null; // make sure to set the connection back to null to avoid null problems with the now destroyed holder

        if (linkedDestruction == true)
            cmpHealth.SetHitpoints(+0.01); // these units should die from fall damage
        else // if the entities will live, run the ungarrison routine here instead of from the LeaveTurret function to allow the flail animation
        {
            let cmpUnitAI = Engine.QueryInterface(ent, IID_UnitAI);
	        if (cmpUnitAI)
	        {
	        	cmpUnitAI.Ungarrison();
	        	cmpUnitAI.UnsetGarrisoned();
	        	cmpUnitAI.ResetTurretStance();
            }

            // This battalion will start to act as soldiers now, so remove the HiddenUI class from them
            let classes = Engine.QueryInterface(ent, IID_Identity).classesList;
            for (let i = 0; i < classes.length; i++)
            {
                if (classes[i] == "HiddenUI")
                {
                    classes.splice(i, 1);
                    break;
                }
            }
        }
    }

    if (linkedDestruction == false) // force the units back into formation if they survive the fall damage
    {
        let owner = Engine.QueryInterface(this.garrisonSpawnedEntities[0], IID_Ownership).GetOwner();
        let formationTemplate = Engine.QueryInterface(this.garrisonSpawnedEntities[0], IID_Battalion).GetFormationTemplate();
        ProcessCommand(owner, { "type": "formation", "entities": this.garrisonSpawnedEntities, "formation": formationTemplate });
    }

    for (let ent of this.garrisonSpawnedEntities)
        AttackHelper.ApplyKnockbackManual(ent, 15, 15); // Apply manual knockback since there is no attacker present and after all other procedures have been dealt with
};

// init intervalspawn data for constructed entity
Health.prototype.SpawnOnIntervalInit = function ()
{
    if (this.template.SpawnOnInterval)
    {
        let cmpFoundation = Engine.QueryInterface(this.entity, IID_Foundation);
        if (cmpFoundation)
            return;
  
        this.intervalSpawnInfo =
        {
            "template": this.template.SpawnOnInterval.Template,
            "max": ApplyValueModificationsToEntity("Health/SpawnOnInterval/Max", +this.template.SpawnOnInterval.Max, this.entity),
            "startDelay": +this.template.SpawnOnInterval.StartDelay,
            "interval": ApplyValueModificationsToEntity("Health/SpawnOnInterval/Interval", +this.template.SpawnOnInterval.Interval, this.entity),
            "spawnNumber": ApplyValueModificationsToEntity("Health/SpawnOnInterval/SpawnNumber", +this.template.SpawnOnInterval.SpawnNumber, this.entity),
            "linkedDestruction": this.template.SpawnOnInterval.LinkedDestruction != "false",
        };

        if (this.intervalSpawnedEntities == undefined) // if this list is already created (from the upgrade section), dont remake it
            this.intervalSpawnedEntities = []; // the list that will hold the entities spawned by this entity
        let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
        this.IntervalSpawnTimer = cmpTimer.SetInterval(this.entity, IID_Health, "SpawnOnInterval", this.intervalSpawnInfo.startDelay, this.intervalSpawnInfo.interval, null); // call the interval until the entity is destroyed/dead
    }
};

// interval function called from the timer component
Health.prototype.SpawnOnInterval = function ()
{
    if (this.intervalSpawnedEntities.length >= this.intervalSpawnInfo.max) // dont spawn if the max has been reached
        return;

    var cmpOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
    var cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
    var rot = cmpPosition.GetRotation();

    for (let i = 0; i < this.intervalSpawnInfo.spawnNumber; i++) // loop over the number of spawns per interval
    {
        var spawnedEntity = Engine.AddEntity(this.intervalSpawnInfo.template);
        var cmpSpawnedPosition = Engine.QueryInterface(spawnedEntity, IID_Position);
        var cmpFootprint = Engine.QueryInterface(this.entity, IID_Footprint);
        let pos = cmpFootprint.PickSpawnPoint(spawnedEntity); // get the spawn location from this building

        cmpSpawnedPosition.JumpTo(pos.x, pos.z);
        cmpSpawnedPosition.SetYRotation(rot.y);
        cmpSpawnedPosition.SetXZRotation(rot.x, rot.z);

        // make sure to set the intervalspawn holder before setting the ownership, to prevent the promotion checks to occur before the spawn holder has even been set properly
        this.intervalSpawnedEntities.push(spawnedEntity); // add the newly spawned entity to the origins list
        let cmpSpawnedHealth = Engine.QueryInterface(spawnedEntity, IID_Health);
        cmpSpawnedHealth.intervalSpawnHolderID = this.entity; // make sure to let the spawned entity know who created it
	
	    cmpSpawnedHealth.freeUnit = true;	// Mark this unit as a "free" unit. So we don't need to subtract a unit from the battalion count if it dies

        var cmpSpawnedOwnership = Engine.QueryInterface(spawnedEntity, IID_Ownership);
		
		let ownerID = this.template.SpawnOnInterval.OwnerID;
        if (ownerID != undefined)
        {
            if (cmpSpawnedOwnership)
                cmpSpawnedOwnership.SetOwner(+ownerID);
        }
        else
        {
            if (cmpOwnership && cmpSpawnedOwnership)
                cmpSpawnedOwnership.SetOwner(cmpOwnership.GetOwner());
        }
		
        QueryOwnerInterface(spawnedEntity).AddBattalion([spawnedEntity]); //add this ent to a battalion so it functions inside the commands department
    }
};

Health.prototype.CheckIntervalSpawnInvolvement = function ()
{
    if (this.intervalSpawnHolderID != null) // if the killed unit has a spawn origin remove it from its holders list
    {
        let cmpHealth = Engine.QueryInterface(this.intervalSpawnHolderID, IID_Health);
        for (let i = 0; i < cmpHealth.intervalSpawnedEntities.length; i++)
        {
            if (cmpHealth.intervalSpawnedEntities[i] == this.entity)
            {
                cmpHealth.intervalSpawnedEntities.splice(i, 1);
                break;
            }
        }
    }
    else
    {
        if (this.intervalSpawnInfo == undefined) // if the holder itself is destroyed, kill all spawned entities connected to it unless linked destruction is off
            return;

        let linkedDestruction = this.intervalSpawnInfo.linkedDestruction;
        for (let ent of this.intervalSpawnedEntities)
        {
            let cmpHealth = Engine.QueryInterface(ent, IID_Health);
            cmpHealth.intervalSpawnHolderID = null; // make sure to set the connection back to null to avoid null problems with the now destroyed holder

            if (linkedDestruction == true)
                cmpHealth.Kill();
        }
    }
};

// finish the spawning operations for the units that have already been spawned
Health.prototype.CheckProductionSpawningState = function ()
{
    let cmpProductionQueue = Engine.QueryInterface(this.entity, IID_ProductionQueue);
    if (cmpProductionQueue && cmpProductionQueue.IsSpawning == true)
    {
        cmpProductionQueue.IsDestroyed = true;
        for (let data of cmpProductionQueue.SpawnData.values())
            cmpProductionQueue.FinishSpawnOperations(data);
    }
};

// update the battalion from the killed entity if it exists
Health.prototype.UpdateBattalionStatus = function ()
{
    let cmpBattalion = Engine.QueryInterface(this.entity, IID_Battalion);
    if (!cmpBattalion || cmpBattalion.ownBattalionID == -1) // make sure this entity is part of a battalion first
        return;

    let battalionID = cmpBattalion.ownBattalionID;
    let cmpPlayer = QueryOwnerInterface(this.entity);
    let ownBattalion = cmpPlayer.GetBattalion(battalionID);

    if (ownBattalion.length <= 1) // if the length of this battalion is 1 or less, simply delete it and return
    {
        cmpPlayer.allBattalions.delete(battalionID);
	
	    // Only reduce the battalion counter, if a non free unit gets killed
        if (!this.freeUnit)
        {
	        let cmpCost = Engine.QueryInterface(this.entity, IID_Cost);
	        let battalionSlots = cmpCost.GetBattalionSlots();
	        cmpPlayer.AddPopulation(-1 * battalionSlots);
	    }

	    // HC_TODO: Temporary fix to make units disappear in the UI
	    // Messages do not seem to work correctly
        Engine.BroadcastMessage(MT_BattalionUpdate, { "delete": true, "id": battalionID, "player": cmpPlayer.playerID });
	    var cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
	    cmpGUIInterface.OnBattalionUpdate({ "delete": true, "id": battalionID, "player": cmpPlayer.playerID });
        return;
    }

    for (let i = 0; i < ownBattalion.length; i++) // remove this entity from its battalion
    {
        if (ownBattalion[i] == this.entity)
        {
            ownBattalion.splice(i, 1);
	    
	        // HC_TODO: Temporary fix to make units disappear in the UI
	        // Messages do not seem to work correctly
            Engine.BroadcastMessage(MT_BattalionUpdate, { "data": ownBattalion, "id": battalionID, "player": cmpPlayer.playerID });
	        var cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
	        cmpGUIInterface.OnBattalionUpdate({ "data": ownBattalion, "id": battalionID, "player": cmpPlayer.playerID });
            return; // entity has been removed from battalion, so return
        }
    }
};

Health.prototype.OnGlobalResearchFinished = function (msg)
{
    let cmpOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
    if (msg.player != cmpOwnership.GetOwner()) // continue if the tech was researched by this player
        return;

    if (this.intervalSpawnInfo != undefined) // apply value changes to the interval spawner if its present
    {
        let interval = +this.template.SpawnOnInterval.Interval;
        let newInterval = ApplyValueModificationsToEntity("Health/SpawnOnInterval/Interval", interval, this.entity);
        if (interval != newInterval) // interval time was changed by this tech, so cancel and reset the interval timer
        {
            let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
            cmpTimer.CancelTimer(this.IntervalSpawnTimer);
            this.intervalSpawnInfo.interval = newInterval;
            this.IntervalSpawnTimer = cmpTimer.SetInterval(this.entity, IID_Health, "SpawnOnInterval", this.intervalSpawnInfo.interval, this.intervalSpawnInfo.interval, null); 
        }
        this.intervalSpawnInfo.max = ApplyValueModificationsToEntity("Health/SpawnOnInterval/Max", +this.template.SpawnOnInterval.Max, this.entity);
        this.intervalSpawnInfo.spawnNumber = ApplyValueModificationsToEntity("Health/SpawnOnInterval/SpawnNumber", +this.template.SpawnOnInterval.SpawnNumber, this.entity);
    }
};

// Called by the timer during initialization
// We need to add a timer for this, as cmpPlayer is undefined when the entity is created first
Health.prototype.TransformThisEntityAndReplenishBattalion = function ()
{
    let cmpPlayer = QueryOwnerInterface (this.entity);
    let timeToWaitUntilTransformation = this.template.TransformAfterCreation.TemplateToTransformInto;
    cmpPlayer.TransformEntity (this.entity, timeToWaitUntilTransformation, true);
}
