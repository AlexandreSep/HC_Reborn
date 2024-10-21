ProductionQueue.prototype.InitHyrule = function ()
{
	this.destinationOffsets = [];
	if (this.template.DestinationOffset)
	{
		for (let element in this.template.DestinationOffset)
			this.destinationOffsets.push(new Vector2D(this.template.DestinationOffset[element].X, this.template.DestinationOffset[element].Z));
	}

	this.SpawnData = new Map(); // holds all the active spawn data
	this.spawnDataIndex = 0; // unique index used and incremented upon the creation of a new spawndata
	this.IsSpawning = false; // whether this entity has any active spawn data
	this.IsDestroyed = false; // whether this entity was destroyed in any way
}
/**
 *  Hides units if their required technology is not researched
 */
ProductionQueue.prototype.HideUnresearchedUnits = function (cmpPlayer,cmpTemplateManager, entitiesList)
{
	let cmpTechnologyManager = QueryPlayerIDInterface(cmpPlayer.playerID, IID_TechnologyManager);
	for (let template of entitiesList)
	{
		let hideIfTechnologyRequirementNotMet = cmpTemplateManager.GetTemplate(template).Identity.HideIfTechnologyRequirementIsNotMet;
		if (!(hideIfTechnologyRequirementNotMet == "true"))
		{ // We read from the template directly, so this is a string instead of a boolean
			continue;
		}

		let requiredTechnology = cmpTemplateManager.GetTemplate(template).Identity.RequiredTechnology;
		let requiredTechIsResearched = cmpTechnologyManager.IsTechnologyResearched(requiredTechnology);
		if (requiredTechnology && !requiredTechIsResearched)
		{
			disabledEntities[template] = true;
		} else
		{
			// We must remove the technology from the list when it is researched later in the game. Else the starting CC will never show heroes after selecting them
			disabledEntities[template] = false;
		}
	}

	// ToDo: Is this still needed? If so might want to check whether you changed something above.
	Engine.PostMessage(this.entity, MT_ProductionQueueChanged, {});
}

/**
 *  Hides units if their required technology is not researched
 */
ProductionQueue.prototype.ShouldHideTech = function (template)
{
	let requiredTechIsNotResearched = false;

    let cmpPlayer = QueryOwnerInterface(this.entity);
	if (!cmpPlayer)
		return false;
        
    let cmpTechnologyManager = QueryPlayerIDInterface(cmpPlayer.playerID, IID_TechnologyManager);
    
	if (template.hideIfTechnologyRequirementIsNotMet && template.hideIfTechnologyRequirementIsNotMet == "true")
	{
		for (let requirement of template.requirements.all)
		{
			let requiredTech = requirement.tech;
			if (!requiredTech)
			{
				continue;
			}
			if (!cmpTechnologyManager.IsTechnologyResearched(requiredTech))
			{
				requiredTechIsNotResearched = true;
			}
		}
		if (requiredTechIsNotResearched)
		{
			return false;
		}
	}

	return true;
}

ProductionQueue.prototype.CalculateEntitiesList = function()
{
    this.entitiesList = [];
	if (!this.template.Entities)
		return;

	let string = this.template.Entities._string;
	if (!string)
		return;

	// Replace the "{civ}" and "{native}" codes with the owner's civ ID and entity's civ ID.
	let cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
	let cmpPlayer = QueryOwnerInterface(this.entity);
	if (!cmpPlayer)
		return;

	let cmpIdentity = Engine.QueryInterface(this.entity, IID_Identity);
	if (cmpIdentity)
		string = string.replace(/\{native\}/g, cmpIdentity.GetCiv());

	let entitiesList = string.replace(/\{civ\}/g, cmpPlayer.GetCiv()).split(/\s+/);
	
	// filter out disabled and invalid entities
	let disabledEntities = cmpPlayer.GetDisabledTemplates();
	// HC code -- Hides units if their required technology is not researched 
	let cmpTechnologyManager = QueryPlayerIDInterface(cmpPlayer.playerID, IID_TechnologyManager);
	for(let template of entitiesList){
	    let hideIfTechnologyRequirementNotMet = cmpTemplateManager.GetTemplate(template).Identity.HideIfTechnologyRequirementIsNotMet;
	    if (! (hideIfTechnologyRequirementNotMet == "true")){ // We read from the template directly, so this is a string instead of a boolean
            continue;
	    }
	    
	    let requiredTechnology = cmpTemplateManager.GetTemplate(template).Identity.RequiredTechnology;
	    let requiredTechIsResearched = cmpTechnologyManager.IsTechnologyResearched(requiredTechnology);
	    if (requiredTechnology && !requiredTechIsResearched){
            disabledEntities[template] = true;
	    } else {
            // We must remove the technology from the list when it is researched later in the game. Else the starting CC will never show heroes after selecting them
            disabledEntities[template] = false;
	    }
	}
	// HC code END
	
	entitiesList = entitiesList.filter(ent => !disabledEntities[ent] && cmpTemplateManager.TemplateExists(ent));
	
	// check if some templates need to show their advanced or elite version
	let upgradeTemplate = function(templateName)
	{
		let template = cmpTemplateManager.GetTemplate(templateName);
		while (template && template.Promotion !== undefined)
		{
			let requiredXp = ApplyValueModificationsToTemplate("Promotion/RequiredXp", +template.Promotion.RequiredXp, cmpPlayer.GetPlayerID(), template);
			if (requiredXp > 0)
				break;
			templateName = template.Promotion.Entity;
			template = cmpTemplateManager.GetTemplate(templateName);
		}
		return templateName;
	};

	for (let templateName of entitiesList)
		this.entitiesList.push(upgradeTemplate(templateName));

	for (let item of this.queue)
		if (item.unitTemplate)
            item.unitTemplate = upgradeTemplate(item.unitTemplate);

    Engine.PostMessage(this.entity, MT_ProductionQueueChanged, {});
};

ProductionQueue.prototype.InitiateHyruleSpawn = function (item, createdEnts)
{
    let cmpFootprint = Engine.QueryInterface(this.entity, IID_Footprint);
    let spawnedEnts = [];

    let cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
    let buildingPos = cmpPosition.GetPosition();
    let destinationPoints = [];

    // rotate and set the destination points using the offsets provided
    if (this.destinationOffsets.length > 0) {
        for (let offset of this.destinationOffsets) {
            let tempOffset = new Vector2D(offset.x, offset.y); // cache for the offset value rather than the reference
            tempOffset.rotate(cmpPosition.GetRotation().y);
            destinationPoints.push(new Vector2D(buildingPos.x + tempOffset.x, buildingPos.z + tempOffset.y)); // push the destination points
        }
    }
    else // if no destination points have been specified, use the pickspawnpoint from the footprint component instead
        destinationPoints.push(Vector2D.from3D(cmpFootprint.PickSpawnPoint(this.entityCache[0])));

    if (buildingPos.y < 0)
        return createdEnts.length;

    let cmpBattalion = Engine.QueryInterface(this.entityCache[0], IID_Battalion);
    let actorSeed = -1;
    if (cmpBattalion.UseSameActorSeed() == true)
        actorSeed = Engine.QueryInterface(this.entityCache[0], IID_Visual).GetActorSeed();

    let deltaSpawn = cmpBattalion.GetSpawnDeltaTime(); // miliseconds inbetween every unit whose location is set to the building its spawned from AKA "spawned"
    let SpawnData = {
        "destinationPoints": destinationPoints, "Producer": this.entity,
        "spawnedEnts": spawnedEnts, "createdEnts": createdEnts, "finalIndex": item.count - 1, "index": 0, "thresholdTotal": 0, "actorSeed": actorSeed, "population": item.population, "queueID": item.id
    };

    let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
    SpawnData.defaultStance = Engine.QueryInterface(this.entityCache[0], IID_UnitAI).GetStanceName(); // cache the default stance since we change it to none until it is carried over to the player who created it
    SpawnData.spawnDataIndex = this.spawnDataIndex;
    this.SpawnData.set(this.spawnDataIndex, SpawnData);
    this.spawnDataIndex += 1;

    for (let i = 0; i < item.count; ++i) {
        // push data to createdEnts instantly so the progressTimeout can finish its operations 
        let ent = this.entityCache[0];
        this.entityCache.shift();
        createdEnts.push(ent);

        if (i == 0) // the first unit spawn doesnt require a delay
            this.SpawnEntity(SpawnData);
        else
            cmpTimer.SetTimeout(this.entity, IID_ProductionQueue, "SpawnEntity", (deltaSpawn * i), SpawnData);
    }

    this.IsSpawning = true;
};

ProductionQueue.prototype.SpawnEntity = function (data, lateness)
{
    if (this.IsDestroyed == true) // the entity tends to exist for a little while after the destruction call, pretend another unit from spawning in that case
        return;

    // Initialize Components from data
    let cmpOwnership = Engine.QueryInterface(data.Producer, IID_Ownership);

    let ent = data.createdEnts[data.index]; // get a created entity based upon the current iteration
    let cmpNewOwnership = Engine.QueryInterface(ent, IID_Ownership);
   
    let cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
    let buildingRotationY = cmpPosition.GetRotation().y;

    let cmpUnitAI = Engine.QueryInterface(ent, IID_UnitAI);
    Engine.QueryInterface(ent, IID_Resistance).SetInvulnerability(true); // newly created units start as invulnerable
    let cmpNewPosition = Engine.QueryInterface(ent, IID_Position);

    let offset = new Vector2D(0, 0);
    if (this.template.SpawnOffset) // get custom spawn offset provided for this building, otherwise use an empty offset
    {
        offset = new Vector2D(+this.template.SpawnOffset.X, +this.template.SpawnOffset.Z);
        offset.rotate(buildingRotationY);
    }

    cmpNewPosition.SetYRotation(buildingRotationY); // rotate the unit with the rotation of the building before spawning
    let buildingPos = cmpPosition.GetPosition2D();
    cmpNewPosition.JumpTo(buildingPos.x + offset.x, buildingPos.y + offset.y); // set spawn location to this building + an offset based upon the rotation of this building

    let actorSeed = data.actorSeed;
    if (actorSeed != -1) // set actorseed if present
        Engine.QueryInterface(ent, IID_Visual).SetActorSeed(actorSeed);

    data.spawnedEnts.push(ent);

    // entity has been spawned so move to target location and set current stance to none
    cmpUnitAI.SwitchToStance("none");
    Engine.QueryInterface(ent, IID_Obstruction).SetActive(false); // set obstruction blockers to false

    let destinationPoints = data.destinationPoints; // cache destination points

    // initialize lineup variables
    let lineupOffset = new Vector2D(1, 0); // offset between every spawned entity
    let maxThreshold = 1000; // at what point to add the additional offset given by the threshold
    let maxThresholdOffset = new Vector2D(1, 0); // the additional offset to add
    if (this.template.LineupOffset) // when provided, set the lineup data from the template
    {
        lineupOffset = new Vector2D(+this.template.LineupOffset.X, +this.template.LineupOffset.Z);
        if (this.template.LineupOffset.MaxThresholdOffset)
        {
            maxThreshold = +this.template.LineupOffset.MaxThresholdOffset.Threshold;
            maxThresholdOffset = new Vector2D(+this.template.LineupOffset.MaxThresholdOffset.X, +this.template.LineupOffset.MaxThresholdOffset.Z);
        }
    }
    // set lineup vectors based upon the rotation of this building
    lineupOffset.rotate(buildingRotationY);
    maxThresholdOffset.rotate(buildingRotationY);

    cmpUnitAI.Walk(destinationPoints[0].x, destinationPoints[0].y, false); // walk to the first destination without queuing
    for (let i = 1; i < destinationPoints.length; i++) // if there are more destinations specified, queue those after the first one
    {
        if (i == destinationPoints.length - 1) // if this is the last destination point, add lineup offsets
        {
            if (data.index % maxThreshold == 0 && data.index != 0) // for every time the threshold is reached, add an additional offset
            {
                destinationPoints[i] = new Vector2D(destinationPoints[i].x + maxThresholdOffset.x, destinationPoints[i].y + maxThresholdOffset.y);
                data.thresholdTotal += maxThreshold; // acts as a reset for the destination point index used
            }

            let newDestination = new Vector2D // use a new vector to set the specific destination point for this entity, using the destination points
            (
                destinationPoints[i].x + (data.index - data.thresholdTotal) * lineupOffset.x,
                destinationPoints[i].y + (data.index - data.thresholdTotal) * lineupOffset.y
            );

            cmpUnitAI.Walk(newDestination.x, newDestination.y, true);
        }
        else // otherwise, simply queue this destination
            cmpUnitAI.Walk(destinationPoints[i].x, destinationPoints[i].y, true);
    }

    // Player owns the entity, but can not control it until the spawn process has finished
    cmpNewOwnership.SetOwner(cmpOwnership.GetOwner());
    let cmpIdentity = Engine.QueryInterface(ent, IID_Identity);
    cmpIdentity.controllable = false;

    let cmpPlayerStatisticsTracker = QueryOwnerInterface(this.entity, IID_StatisticsTracker);
    if (cmpPlayerStatisticsTracker)
        cmpPlayerStatisticsTracker.IncreaseTrainedUnitsCounter(ent);

    // all units from this item have been spawned, execute final operations
    // could also call another Timeout for the final operations, but its better to do it from SpawnEntity to prevent lateness from causing potential call order problems
    if (data.index >= data.finalIndex)
        this.HasReachedSpawnPoint(data);

    data.index += 1; // increment data index for next SpawnEntity call
};

// Check if all the spawned units that belong to this spawn data have reached their final spawnpoint
// and if so, call the final spawn operations
ProductionQueue.prototype.HasReachedSpawnPoint = function (data, lateness)
{
    for (let ent of data.spawnedEnts)
    {
	//~ warn("Inside for loop, ent: " + ent);
        let cmpUnitAI = Engine.QueryInterface(ent, IID_UnitAI);
        if (!cmpUnitAI){
            return;
	    }

        if (cmpUnitAI.IsIdle() == false) // if one of the units hasnt reached the destination, recheck 200 miliseconds later
        {
            let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
            data.spawnTimer = cmpTimer.SetTimeout(this.entity, IID_ProductionQueue, "HasReachedSpawnPoint", 200, data);
            return;
        }
    }
    this.FinishSpawnOperations(data);
}

// Upon reaching the destination location, execute final operations
ProductionQueue.prototype.FinishSpawnOperations = function (data)
{
    // Initialize Components from data
    let cmpOwnership = Engine.QueryInterface(data.Producer, IID_Ownership);
    let cmpRallyPoint = Engine.QueryInterface(data.Producer, IID_RallyPoint);

    if (this.IsDestroyed == true)
    {
        //if all the units have been spawned, but the building is destroyed, it might call this function twice
        //once from the manual destruction call in health, and once from the call that occurs after all the units are spawned
        //to prevent this from happening, cancel the timer that was initiated by the SpawnEntity function
        if (data.spawnTimer != undefined)
            Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer).CancelTimer(data.spawnTimer);
    }

    this.SpawnData.delete(data.spawnDataIndex);

    for (let ent of data.spawnedEnts)
    {
        let cmpPosition = Engine.QueryInterface(ent, IID_Position);
        if (!cmpPosition)
            continue;

        // reset invulnerability and stance of the spawned unit
	// allow the player now to control the battalion
        Engine.QueryInterface(ent, IID_UnitAI).SwitchToStance(data.defaultStance);
        Engine.QueryInterface(ent, IID_Resistance).SetInvulnerability(false);
        Engine.QueryInterface(ent, IID_Obstruction).SetActive(true); // set obstruction back to true
        Engine.QueryInterface(ent, IID_Identity).controllable = true; // Now the player can control the whole battalion

        //Spawn Garrison units for entities that have the component activated
        let cmpHealth = Engine.QueryInterface(ent, IID_Health);
        if (cmpHealth.template.SpawnGarrison != undefined)
            cmpHealth.SpawnGarrisonUnits();

        // if this entity has a training restriction set like heroes and titans, it has been reserved by the ownership creation
        // decrement it back when the unit has been converted
        let cmpTrainingRestrictions = Engine.QueryInterface(ent, IID_TrainingRestrictions);
        if (cmpTrainingRestrictions) {
            let unitCategory = cmpTrainingRestrictions.GetCategory();
            QueryOwnerInterface(this.entity, IID_EntityLimits).ChangeCount(unitCategory, -1);
        }
    }

    PlaySound("trained", data.spawnedEnts[0]); // play sound for the first unit only

    //with batch training, the battalions should be separately added
    let cmpBattalion = Engine.QueryInterface(data.createdEnts[0], IID_Battalion);
    let battalionSize = cmpBattalion.GetBattalionSize();
    let numberOfBattalions = data.createdEnts.length / battalionSize;
    let cmpPlayer = QueryOwnerInterface(this.entity);
    let battalionIndices = [];

    // remove the mock population that was added at the start of the creation routine
    // @EXO: When this line exists, each unit in the battalion will reduce the battalion slot counter by its population value
    //~ cmpPlayer.UnReservePopulationSlots(data.population * data.createdEnts.length);

    // add battalions for the number of batches trained
    for (let j = 0; j < numberOfBattalions; j++) {
        let tempArray = [];
        let currentIndex = battalionSize * j; //move through the createdEnts list using the battalion size
        for (let i = currentIndex; i < currentIndex + battalionSize; i++) {
            if (data.spawnedEnts[i]) // if this index is undefined, the building was mostly likely destroyed during creation so break
                tempArray.push(data.spawnedEnts[i]);
            else
                break;
        }

        ProcessCommand(cmpOwnership.GetOwner(), { "type": "formation", "entities": tempArray, "formation": cmpBattalion.GetFormationTemplate() });
        battalionIndices.push(cmpPlayer.AddBattalion(tempArray, data.actorSeed)); // save this collection as a single battalion
    }  

    // if a promotion tech finishes while units are following their spawn routine, add the required exp if applicable
    // make sure a battalion has been created before executing these operations
    let hasBeenPromoted = false;
    for (let ent of data.spawnedEnts) {
        let cmpPromotion = Engine.QueryInterface(ent, IID_Promotion);
        //warn("cmpPromotion.GetRequiredXp() " + cmpPromotion.GetRequiredXp() + " for ent " + ent);
        if (cmpPromotion && cmpPromotion.GetRequiredXp() < 1) {
            cmpPromotion.IncreaseXp(+1);
            hasBeenPromoted = true;
        }
    }

    //if these units have been promoted, replace the new spawned entities with the promoted ones
    if (hasBeenPromoted == true) {
        data.spawnedEnts.length = 0;
        for (let index of battalionIndices)
            data.spawnedEnts = data.spawnedEnts.concat(cmpPlayer.GetBattalion(index));
    }

    // spawn operations finished, remove this completed queue element that was set before in the ProgressTimeout
    for (let i = 0; i < this.queue.length; i++)
    {
        if (this.queue[i].id == data.queueID)
        {
            this.queue.splice(i, 1);
            Engine.PostMessage(this.entity, MT_ProductionQueueChanged, {});
            break;
        }
    }

    if (data.spawnedEnts.length > 0 && !data.autoGarrison) {
        // If a rally point is set, walk towards it (in formation) using a suitable command based on where the
        // rally point is placed.
        if (cmpRallyPoint) {
            var rallyPos = cmpRallyPoint.GetPositions()[0];
            if (rallyPos) {
                var commands = GetRallyPointCommands(cmpRallyPoint, data.spawnedEnts);
                for (var com of commands)
                    ProcessCommand(cmpOwnership.GetOwner(), com);
            }
        }
    }

    if (data.createdEnts.length > 0)
        Engine.PostMessage(this.entity, MT_TrainingFinished,
            {
                "entities": data.spawnedEnts,
                "owner": cmpOwnership.GetOwner(),
                "metadata": data.metadata,
            });

    this.IsSpawning = false;
};
