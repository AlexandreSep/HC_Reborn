Player.prototype.InitHyrule = function()
{
    this.corpses = [];
    this.allBattalions = new Map();
    this.resourceGatherersBattalions = {}; // Contains Maps of Sets. {resourceType: {battalionID:{gathererID_1, gethererID_2, ...} } }
    this.allSpottedEntities = {};
    this.currentBattalionIndex = 0;
    this.fairySeasonCurrent = "spring";
    this.heroSettings = new Object();

    // We store a ring buffer that stores the amount of resources collected during the last X seconds
    // That way we can make a rough estimation about the acquisation rate of the amount of resources we get
    this.resourceBufferIndex = 0;
    this.resourceBufferIntervals = 40; // How many past time frames are stored
    this.resourceBufferUpdateTime = 1000; // In milliseconds
    this.resourceBufferGatherRatePerSeconds = 5; // If this is 5 the UI displays the average gather rate per 5 seconds
    this.recentlyCollectedResources = new Array();
    this.averageResourceGatherRates = new Array();

    // Initial Resources
    let resCodes = Resources.GetCodes();
    for (let res of resCodes)
    {
	// We need to count battalions instead of individual troops
	this.resourceGatherersBattalions[res] = new Map;

	// We need this to estimate the average resource gain
	this.recentlyCollectedResources[res] = new Array();
	this.averageResourceGatherRates[res] = 0;
	for (let j = 0; j < this.resourceBufferIntervals; j++){
		this.recentlyCollectedResources[res][j] = 0;
	}
    }

    let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
    cmpTimer.SetInterval(this.entity, IID_Player, "UpdateResourceBuffer", 1000, this.resourceBufferUpdateTime, null);
    cmpTimer.SetInterval(this.entity, IID_Player, "CalculateAverageResourceGatherRates", 1000, 5000, null);
    cmpTimer.SetInterval(this.entity, IID_Player, "SendBattalionOrdersToGuiInterface", 1000, 500, null);
}

/**
 * @param {string} type - The generic type of resource to add the gatherer for.
 * @param {int} type - Unit ID if the gatherer.
 */
// Does the same as 0ad AddResourceGatherer but has one more argument
// We need the gathererID to count battalions instead of individual units
Player.prototype.AddResourceGathererHyrule = function(type, gathererID)
{
	let cmpBattalion = Engine.QueryInterface(gathererID, IID_Battalion);
	let battalionID = cmpBattalion.ownBattalionID;

	if ( !this.resourceGatherersBattalions[type].has(battalionID) ){
		this.resourceGatherersBattalions[type].set(battalionID, new Set() );
	}
	
	this.resourceGatherersBattalions[type].get(battalionID).add(gathererID);

	this.resourceGatherers[type] = this.resourceGatherersBattalions[type].size;
};

/**
 * @param {string} type - The generic type of resource to add the gatherer for.
 * @param {int} type - Unit ID if the gatherer.
 */
// Does the same as 0ad RemoveResourceGatherer but has one more argument
// We need the gathererID to count battalions instead of individual units
Player.prototype.RemoveResourceGathererHyrule = function(type, gathererID)
{
	let cmpBattalion = Engine.QueryInterface(gathererID, IID_Battalion);
	let battalionID = cmpBattalion.ownBattalionID;

	if (this.resourceGatherersBattalions[type].has(battalionID)){
		this.resourceGatherersBattalions[type].get(battalionID).delete(gathererID);

		if (this.resourceGatherersBattalions[type].get(battalionID).size == 0){
			this.resourceGatherersBattalions[type].delete(battalionID);
		}
	}
	
	this.resourceGatherers[type] = this.resourceGatherersBattalions[type].size;
};

Player.prototype.CheckDestroyCorpse = function ()
{
    if (this.corpses.length < +this.template.CorpseMax) // destroy corpses once there are about to be more than 10
        return;

    let corpse = this.corpses[0]; // remove from the bottom of the list so corpses that have been around the longest disappear
    this.corpses.splice(0, 1);

    if (corpse)
        Engine.DestroyEntity(corpse);
};

Player.prototype.AddBattalion = function (ents, actorSeed = -1)
{
    if (ents.length == 0)
        return;

    //error("add battalion with index " + this.currentBattalionIndex + " and length " + ents.length);
    this.allBattalions.set(this.currentBattalionIndex, ents);

    for (let ent of ents)
    {
        let cmpBattalion = Engine.QueryInterface(ent, IID_Battalion);
        cmpBattalion.SetOwnBattalion(this.currentBattalionIndex, actorSeed);
    }

    // HC_TODO: Messages do not work. I call this directly now
    Engine.BroadcastMessage(MT_BattalionAdded, { "player": this.playerID, "id": this.currentBattalionIndex, "entities": ents });
    let cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
    cmpGUIInterface.OnBattalionAdded({ "player": this.playerID, "id": this.currentBattalionIndex, "entities": ents });
   
    this.currentBattalionIndex += 1;
    
    //if (ents.length > 1)
    //{
    //    let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
    //    let cmpBattalion = Engine.QueryInterface(ents[0], IID_Battalion);
    //    cmpBattalion.replenishTimer = cmpTimer.SetInterval(ents[0], IID_Battalion, "ReplenishBattalion", 1000, 1000, {});
    //}

    return this.currentBattalionIndex - 1;
};

/**
 * replace/update one entity inside a battalion with a new one
 */
Player.prototype.ReplaceBattalionEntity = function (oldEntity, newEntity)
{
    let cmpBattalion = Engine.QueryInterface(oldEntity, IID_Battalion);
    if (!cmpBattalion) // make sure this entity should have a battalion first
        return false;

    if (cmpBattalion.ownBattalionID == -1) // if this entity is not yet assigned to a battalion, delay the promotion by returning true
        return true;

    let battalionID = cmpBattalion.ownBattalionID;
    let battalionEnts = this.GetBattalion(battalionID);
    for (let i = 0; i < battalionEnts.length; i++) // update the old entities place inside the battalion to the newly upgraded one
    {
        if (battalionEnts[i] == oldEntity)
        {
            battalionEnts[i] = newEntity; // assign by reference
            break; // replaced the old entity, break
        }
    }
    //let the new entity know which battalion ID it belongs to
    let cmpBattalionNew = Engine.QueryInterface(newEntity, IID_Battalion);
    cmpBattalionNew.ownBattalionID = battalionID;

    // update the actorseed for the new entity if present
    if (cmpBattalion.UseSameActorSeed() == true)
    {
        let actorSeed = cmpBattalion.GetActorSeed();
        cmpBattalionNew.actorSeed = actorSeed;
        Engine.QueryInterface(newEntity, IID_Visual).SetActorSeed(actorSeed);
    }

    let cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
    cmpGUIInterface.OnBattalionUpdate({ "data": battalionEnts, "id": battalionID, "entity": newEntity, "player": this.playerID });
    
    Engine.BroadcastMessage(MT_BattalionUpdate, { "data": battalionEnts, "id": battalionID, "entity": newEntity, "player": this.playerID });
};

// takes all the start entities that were placed on the map and adds them into a battalion if applicable
Player.prototype.SetInitBattalions = function ()
{
    let startEntities = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager).GetEntitiesByPlayer(this.playerID);
    for (let entity of startEntities)
    {
        let cmpBattalion = Engine.QueryInterface(entity, IID_Battalion);
        if (cmpBattalion){

	    // Do not add Plots. They are already added in Plots.SpawnPlots().
	    // Add all other single manually placed entities into their own battalion
	    let cmpPlots = Engine.QueryInterface(entity, IID_Plots);
	    if (!cmpPlots || !cmpPlots.isPlot){
		this.AddBattalion([entity]);
	    }

            // Make the unit comsume battalion slots
            let cmpCost = Engine.QueryInterface(entity, IID_Cost);
            if (!cmpCost){
		let cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
		let templateName = cmpTemplateManager.GetCurrentTemplateName(entity);
		error("'The following template has no cost component but needs one: " + templateName);
		continue;
	    }
	    let battalionSlots = cmpCost.GetBattalionSlots();
	    if (battalionSlots){
		this.AddPopulation(cmpCost.GetBattalionSlots());
	    }

            // Fill the battalion of the starting units
            this.AddUnitsToBattalion(cmpBattalion.ownBattalionID, cmpBattalion.GetBattalionSize()-1);
	}
    }
};

Player.prototype.AddUnitsToBattalion = function (battalionID, numberOfUnitsToAdd, allowExceedSizeLimit = false, spawnInPlaceOfOldEntity = false, templateToSpawn = undefined)
{
	let battalionEntities = this.GetBattalion(battalionID);
	if (!battalionEntities){
		return;
	}
	let firstEntityInBattalion = this.GetBattalion(battalionID)[0];

	let cmpBattalion = Engine.QueryInterface(firstEntityInBattalion, IID_Battalion);
	let maxBattalionSize = cmpBattalion.GetBattalionSize();
	let currentBattalionSize = this.GetBattalion(battalionID).size;

	if( ((currentBattalionSize + numberOfUnitsToAdd) > maxBattalionSize) && (allowExceedSizeLimit == false) ){
		numberOfUnitsToAdd = numberOfUnitsToAdd -((currentBattalionSize + numberOfUnitsToAdd) - maxBattalionSize);
	}

	for (let i = 0; i < numberOfUnitsToAdd; i++){
	    let cmpThisPosition = Engine.QueryInterface(firstEntityInBattalion, IID_Position);
	    if (!cmpThisPosition){
			continue;
		}

		// Spawn the new entity
		if (!templateToSpawn){
			let cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
			templateToSpawn = cmpTemplateManager.GetCurrentTemplateName(firstEntityInBattalion);
		}
		let spawnedEntity = Engine.AddEntity(templateToSpawn);

		// Position the new entity close to the starting unit
		let thisPosition = cmpThisPosition.GetPosition();
		let thisRotation = cmpThisPosition.GetRotation();
		let newEntityPosition = Engine.QueryInterface(spawnedEntity, IID_Position);
		if (spawnInPlaceOfOldEntity){
		    newEntityPosition.JumpTo(thisPosition.x, thisPosition.z); // Make sure the units not spawn at the same place
		}
	    newEntityPosition.JumpTo(thisPosition.x +1 +2*(i%5), thisPosition.z + 2*(i/5)); // Make sure the units not spawn at the same place
	    newEntityPosition.SetYRotation(thisRotation.y);
	    newEntityPosition.SetXZRotation(thisRotation.x, thisRotation.z);

	    // Set the correct ownership
	    let cmpNewOwnership = Engine.QueryInterface(spawnedEntity, IID_Ownership);
	    cmpNewOwnership.SetOwner(this.playerID);

	    // Add the new entity to the battalion of the already existing one
	    let battalionID = cmpBattalion.ownBattalionID;
		let allEntitiesInThisBattalion = this.allBattalions.get(battalionID);
		allEntitiesInThisBattalion.push(spawnedEntity);
		this.allBattalions.set(battalionID, allEntitiesInThisBattalion);

		// Make the new entity aware of its own battalion
		let cmpBattalionNewEntity = Engine.QueryInterface(spawnedEntity, IID_Battalion);
		cmpBattalionNewEntity.SetOwnBattalion(battalionID, cmpBattalion.GetActorSeed());

		// Mark to cost no battalion slots if the other battalion entities are free
		let cmpHealthFirstEntityOfBattalion = Engine.QueryInterface(firstEntityInBattalion, IID_Health);
		let cmpHealthSpawnedEntity = Engine.QueryInterface(spawnedEntity, IID_Health);
		cmpHealthSpawnedEntity.freeUnit = cmpHealthFirstEntityOfBattalion.freeUnit;

		// Set the actor seed to make all units in a battalion look the same if specified
		let actorSeed = -1;
		if (cmpBattalion.UseSameActorSeed() == true){
			actorSeed = Engine.QueryInterface(firstEntityInBattalion, IID_Visual).GetActorSeed();
            Engine.QueryInterface(spawnedEntity, IID_Visual).SetActorSeed(actorSeed);
		}

		// Make entities enter formation
		if (!spawnInPlaceOfOldEntity){
			ProcessCommand(this.playerID, { "type": "formation", "entities": allEntitiesInThisBattalion, "formation": cmpBattalion.GetFormationTemplate() });
		}

		// Make the UI interface aware if we replenish starting battalions
		// Maybe move this functionality to "this.SetInitBattalions".
		// Simply comp-paste breaks the game however
		let cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
		cmpGUIInterface.AddInitBattalion(this.playerID, firstEntityInBattalion, battalionID);
	}
}

Player.prototype.ReplenishBattalionToFull = function (battalionID)
{
	let currentBattalionSize = this.GetBattalion(battalionID).length;
	let cmpBattalion = Engine.QueryInterface(this.GetBattalion(battalionID)[0], IID_Battalion);
	let maxBattalionSize = cmpBattalion.GetBattalionSize();

	let numberOfUnitsToAdd = maxBattalionSize - currentBattalionSize;
	this.AddUnitsToBattalion (battalionID, numberOfUnitsToAdd);

	let cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
	cmpGUIInterface.OnBattalionUpdate({ "data": this.GetBattalion(cmpBattalion.ownBattalionID), "id": cmpBattalion.ownBattalionID, "player": this.playerID });
	
	Engine.BroadcastMessage(MT_BattalionUpdate, { "data": this.GetBattalion(cmpBattalion.ownBattalionID), "id": cmpBattalion.ownBattalionID, "player": this.playerID });
}

Player.prototype.GetBattalion = function (index)
{
    return this.allBattalions.get(index);
};

Player.prototype.UpdateResourceBuffer = function ()
{
	let resCodes = Resources.GetCodes();
	//~ this.CalculateAverageResourceGatherRates();

	this.resourceBufferIndex = (this.resourceBufferIndex + 1) % this.resourceBufferIntervals;
	//~ warn("this.resourceBufferIndex: " + this.resourceBufferIndex);
	for (let i in resCodes)
	{
		let res = resCodes[i];
		this.recentlyCollectedResources[res][this.resourceBufferIndex] = 0;
	}
}

Player.prototype.CalculateAverageResourceGatherRates = function ()
{
	let resCodes = Resources.GetCodes();
	//~ warn("playerID: " + this.playerID);
	//~ warn("resCodes: " + JSON.stringify(resCodes));
	for (let i in resCodes)
	{
		let resourceCollectedDuringInterval = 0;
		let res = resCodes[i];
		//~ warn("res: " + res);
		//~ warn("this.recentlyCollectedResources[res]: " + JSON.stringify(this.recentlyCollectedResources[res]));
		for(let amount of this.recentlyCollectedResources[res]){
			resourceCollectedDuringInterval += +amount;
		}

		let amountLastFiveSeconds = 0;
		for (let j = 0; j < 5; j++){
			let resourceBuffer = this.recentlyCollectedResources[res];
			let resourceBufferLength = resourceBuffer.length;
			//~ warn("resourceBufferLength: " + resourceBufferLength);
			//~ warn("(this.resourceBufferIndex + ((resourceBufferLength -j) % resourceBufferLength): " + (this.resourceBufferIndex + ((resourceBufferLength -j) % resourceBufferLength))% resourceBufferLength);
			let indexToAdd =  (this.resourceBufferIndex + ((resourceBufferLength -j) % resourceBufferLength))% resourceBufferLength;
			amountLastFiveSeconds += +(this.recentlyCollectedResources[res][ indexToAdd])
		}
		//~ warn("amountLastFiveSeconds: " + amountLastFiveSeconds);

		this.averageResourceGatherRates[res] = +(resourceCollectedDuringInterval/(this.resourceBufferIntervals/this.resourceBufferGatherRatePerSeconds)).toFixed(1);
		//~ warn("this.averageResourceGatherRates[res]: " + this.averageResourceGatherRates[res]);
	}
}

Player.prototype.SendBattalionOrdersToGuiInterface = function ()
{
	if (this.playerID == 0){
		return;
	}
	let allBattalionsOrders = new Map();

	for (let battalion of this.allBattalions){
		let battalionID = battalion[0];
		let battalionEntities = battalion[1];
		if (!battalionEntities){
			continue;
		}
		let cmpUnitAI = Engine.QueryInterface(battalionEntities[0], IID_UnitAI);
		if (!cmpUnitAI){
			continue;
		}
		let battalionOrders = cmpUnitAI.GetOrders();
		allBattalionsOrders.set(battalionID, battalionOrders);
	}

	let cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
	cmpGUIInterface.UpdateBattalionOrders(this.playerID, allBattalionsOrders);
}

// If an entity wants to transform itself, it must use this function as both, the old and new entity must be known
Player.prototype.TransformEntity = function (entityToTransform, templateToTransformInto, replenishBattalion)
{
	let newEntity = ChangeEntityTemplate(entityToTransform, templateToTransformInto);
	this.ReplaceBattalionEntity(entityToTransform, newEntity);

	if (replenishBattalion){
		let cmpBattalion = Engine.QueryInterface(newEntity, IID_Battalion);
		let battalionID = cmpBattalion.ownBattalionID;
		this.ReplenishBattalionToFull(battalionID);
	}
}

Player.prototype.GetCurrentFairySeason = function()
{
	if (this.civ == "fairy"){
		return this.fairySeasonCurrent;
	}
	return undefined;
};
