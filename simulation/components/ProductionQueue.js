function ProductionQueue() {}

ProductionQueue.prototype.Schema =
	"<a:help>Allows the building to train new units and research technologies</a:help>" +
	"<a:example>" +
		"<BatchTimeModifier>0.7</BatchTimeModifier>" +
		"<Entities datatype='tokens'>" +
			"\n    units/{civ}/support_female_citizen\n    units/{native}/support_trader\n    units/athen/infantry_spearman_b\n  " +
		"</Entities>" +
	"</a:example>" +
	"<element name='BatchTimeModifier' a:help='Modifier that influences the time benefit for batch training'>" +
		"<ref name='nonNegativeDecimal'/>" +
	"</element>" +
	// HC-Code
    "<optional>" +
        "<element name='SpawnOffset'>" +
        "<interleave>" +
		    "<element name='X'><data type='decimal'/></element>" +
		    "<element name='Z'><data type='decimal'/></element>" +
        "</interleave>" +
        "</element>" +
    "</optional>" +
    "<optional>" +
        "<element name='LineupOffset'>" +
        "<interleave>" +
		    "<element name='X'><data type='decimal'/></element>" +
		    "<element name='Z'><data type='decimal'/></element>" +
            "<optional>" +
                "<element name='MaxThresholdOffset'>" +
                    "<interleave>" +
                        "<element name='X'><data type='decimal'/></element>" +
                        "<element name='Z'><data type='decimal'/></element>" +
                        "<element name='Threshold' a:help=''><data type='positiveInteger'/></element>" +
                    "</interleave>" +
                "</element >" +
            "</optional>" +
        "</interleave>" +
        "</element>" +
    "</optional>" +
    "<optional>" +
		"<element name='DestinationOffset' a:help='Points that will be used to visibly garrison a unit'>" +
			"<zeroOrMore>" +
				"<element a:help='Element containing the offset coordinates'>" +
					"<anyName/>" +
					"<interleave>" +
                        "<element name='X'><data type='decimal'/></element>" +
                        "<element name='Z'><data type='decimal'/></element>" +
					"</interleave>" +
				"</element>" +
			"</zeroOrMore>" +
		"</element>" +
	"</optional>" +
	// HC-End
	"<optional>" +
		"<element name='Entities' a:help='Space-separated list of entity template names that this entity can train. The special string \"{civ}\" will be automatically replaced by the civ code of the entity&apos;s owner, while the string \"{native}\" will be automatically replaced by the entity&apos;s civ code.'>" +
			"<attribute name='datatype'>" +
				"<value>tokens</value>" +
			"</attribute>" +
			"<text/>" +
		"</element>" +
	"</optional>" +
	"<optional>" +
		"<element name='Technologies' a:help='Space-separated list of technology names that this building can research. When present, the special string \"{civ}\" will be automatically replaced either by the civ code of the building&apos;s owner if such a tech exists, or by \"generic\".'>" +
			"<attribute name='datatype'>" +
				"<value>tokens</value>" +
			"</attribute>" +
			"<text/>" +
		"</element>" +
	"</optional>" +
	"<element name='TechCostMultiplier' a:help='Multiplier to modify ressources cost and research time of technologies searched in this building.'>" +
		Resources.BuildSchema("nonNegativeDecimal", ["time"]) +
	"</element>";

ProductionQueue.prototype.ProgressInterval = 1000;
ProductionQueue.prototype.MaxQueueSize = 16;

ProductionQueue.prototype.Init = function()
{
	this.nextID = 1;

	this.queue = [];
	// Queue items are:
	//   {
	//     "id": 1,
	//     "player": 1, // who paid for this batch; we need this to cope with refunds cleanly
	//     "unitTemplate": "units/example",
	//     "count": 10,
	//     "neededSlots": 3, // number of population slots missing for production to begin
	//     "resources": { "wood": 100, ... }, // resources per unit, multiply by count to get total
	//     "population": 1,	// population per unit, multiply by count to get total
	//     "productionStarted": false, // true iff we have reserved population
	//     "entityCache": [189, ...], // The entities created but not spawned yet.
	//     "timeTotal": 15000, // msecs
	//     "timeRemaining": 10000, // msecs
	//   }
	//
	//   {
	//     "id": 1,
	//     "player": 1, // who paid for this research; we need this to cope with refunds cleanly
	//     "technologyTemplate": "example_tech",
	//     "resources": { "wood": 100, ... }, // resources needed for research
	//     "productionStarted": false, // true iff production has started
	//     "timeTotal": 15000, // msecs
	//     "timeRemaining": 10000, // msecs
	//   }
	
	// HC-Code
	this.timer = undefined; // this.ProgressInterval msec timer, active while the queue is non-empty
	this.paused = false;

	this.InitHyrule();
	this.entityCache = [];
	this.spawnNotified = false;
	// HC-End
};

/*
 * Returns list of entities that can be trained by this building.
 */
 // HC-Code. We overwrite the function to be able to hide non available heroes
ProductionQueue.prototype.GetEntitiesList = function()
{
    let cmpPlayer = QueryOwnerInterface(this.entity);
    if (cmpPlayer == null) // HC-code, for some reason, whenever a civil center has been destroyed, the AI owner call = null
        return [];

    let cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
    let cmpTechnologyManager = QueryPlayerIDInterface(cmpPlayer.playerID, IID_TechnologyManager);
    if (!cmpTechnologyManager) // HC-code, when defeated, the cmpPlayer.playerID has no technologymanager
        return [];

    let entitiesList = Array.from(this.entitiesMap.values());
    let entitiesListToDisplay = new Array();
    
    for(let template of entitiesList){
	let hideIfTechnologyRequirementNotMet = cmpTemplateManager.GetTemplate(template).Identity.HideIfTechnologyRequirementIsNotMet;
	if (! (hideIfTechnologyRequirementNotMet == "true")){ // We read from the template directly, so this is a string instead of a boolean
	    entitiesListToDisplay.push(template);
	    continue;
	}
	
	let requiredTechnology = cmpTemplateManager.GetTemplate(template).Identity.RequiredTechnology;
	let requiredTechIsResearched = cmpTechnologyManager.IsTechnologyResearched(requiredTechnology);
	if (requiredTechnology && requiredTechIsResearched){
	    entitiesListToDisplay.push(template);
	}
    }

    return entitiesListToDisplay;
};

/**
 * @return {boolean} - Whether we are automatically queuing items.
 */
ProductionQueue.prototype.IsAutoQueueing = function()
{
	return !!this.autoqueuing;
};

/**
 * Turn on Auto-Queue.
 */
ProductionQueue.prototype.EnableAutoQueue = function()
{
	this.autoqueuing = true;
};

/**
 * Turn off Auto-Queue.
 */
ProductionQueue.prototype.DisableAutoQueue = function()
{
	delete this.autoqueuing;
};

/**
 * Calculate the new list of producible entities
 * and update any entities currently being produced.
 */
ProductionQueue.prototype.CalculateEntitiesMap = function()
{
	// Don't reset the map, it's used below to update entities.
	if (!this.entitiesMap)
		this.entitiesMap = new Map();
	if (!this.template.Entities)
		return;

	let string = this.template.Entities._string;
	// Tokens can be added -> process an empty list to get them.
	let addedTokens = ApplyValueModificationsToEntity("ProductionQueue/Entities/_string", "", this.entity);
	if (!addedTokens && !string)
		return;

	addedTokens = addedTokens == "" ? [] : addedTokens.split(/\s+/);

	let cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
	let cmpPlayer = QueryOwnerInterface(this.entity);
	let cmpIdentity = Engine.QueryInterface(this.entity, IID_Identity);

	let disabledEntities = cmpPlayer ? cmpPlayer.GetDisabledTemplates() : {};

	/**
	 * Process tokens:
	 * - process token modifiers (this is a bit tricky).
	 * - replace the "{civ}" and "{native}" codes with the owner's civ ID and entity's civ ID
	 * - remove disabled entities
	 * - upgrade templates where necessary
	 * This also updates currently queued production (it's more convenient to do it here).
	 */

	let removeAllQueuedTemplate = (token) => {
		let queue = clone(this.queue);
		let template = this.entitiesMap.get(token);
		for (let item of queue)
			if (item.unitTemplate && item.unitTemplate === template)
				this.RemoveItem(item.id);
	};
	let updateAllQueuedTemplate = (token, updateTo) => {
		let template = this.entitiesMap.get(token);
		for (let item of this.queue)
			if (item.unitTemplate && item.unitTemplate === template)
				item.unitTemplate = updateTo;
	};

	let toks = string.split(/\s+/);
	for (let tok of addedTokens)
		toks.push(tok);

	let addedDict = addedTokens.reduce((out, token) => { out[token] = true; return out; }, {});
	this.entitiesMap = toks.reduce((entMap, token) => {
		let rawToken = token;
		if (!(token in addedDict))
		{
			// This is a bit wasteful but I can't think of a simpler/better way.
			// The list of token is unlikely to be a performance bottleneck anyways.
			token = ApplyValueModificationsToEntity("ProductionQueue/Entities/_string", token, this.entity);
			token = token.split(/\s+/);
			if (token.every(tok => addedTokens.indexOf(tok) !== -1))
			{
				removeAllQueuedTemplate(rawToken);
				return entMap;
			}
			token = token[0];
		}
		// Replace the "{civ}" and "{native}" codes with the owner's civ ID and entity's civ ID.
		if (cmpIdentity)
			token = token.replace(/\{native\}/g, cmpIdentity.GetCiv());
		if (cmpPlayer)
			token = token.replace(/\{civ\}/g, cmpPlayer.GetCiv());

		// Filter out disabled and invalid entities.
		if (disabledEntities[token] || !cmpTemplateManager.TemplateExists(token))
		{
			removeAllQueuedTemplate(rawToken);
			return entMap;
		}

		token = this.GetUpgradedTemplate(token);
		entMap.set(rawToken, token);
		updateAllQueuedTemplate(rawToken, token);
		return entMap;
	}, new Map());

    //HC code, Used by the AI to update the entities that can be trained by buildings
    Engine.PostMessage(this.entity, MT_ProductionQueueChanged, {});
};

/*
 * Returns the upgraded template name if necessary.
 */
ProductionQueue.prototype.GetUpgradedTemplate = function(templateName)
{
	let cmpPlayer = QueryOwnerInterface(this.entity);
	if (!cmpPlayer)
		return templateName;

	let cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
	let template = cmpTemplateManager.GetTemplate(templateName);
	while (template && template.Promotion !== undefined)
	{
		let requiredXp = ApplyValueModificationsToTemplate(
		    "Promotion/RequiredXp",
		    +template.Promotion.RequiredXp,
		    cmpPlayer.GetPlayerID(),
		    template);
		if (requiredXp > 0)
			break;
		templateName = template.Promotion.Entity;
		template = cmpTemplateManager.GetTemplate(templateName);
	}
	return templateName;
};

/*
 * Returns list of technologies that can be researched by this building.
 */
ProductionQueue.prototype.GetTechnologiesList = function()
{
	if (!this.template.Technologies)
		return [];

	let string = this.template.Technologies._string;
	string = ApplyValueModificationsToEntity("ProductionQueue/Technologies/_string", string, this.entity);

	if (!string)
		return [];

	let cmpTechnologyManager = QueryOwnerInterface(this.entity, IID_TechnologyManager);
	if (!cmpTechnologyManager)
		return [];

	let cmpPlayer = QueryOwnerInterface(this.entity);
	if (!cmpPlayer)
		return [];

	let techs = string.split(/\s+/);

	// Replace the civ specific technologies.
	for (let i = 0; i < techs.length; ++i)
	{
		let tech = techs[i];
		if (tech.indexOf("{civ}") == -1)
			continue;
		let civTech = tech.replace("{civ}", cmpPlayer.GetCiv());
		techs[i] = TechnologyTemplates.Has(civTech) ? civTech : tech.replace("{civ}", "generic");
	}

	// Remove any technologies that can't be researched by this civ.
	techs = techs.filter(tech =>
		cmpTechnologyManager.CheckTechnologyRequirements(
			DeriveTechnologyRequirements(TechnologyTemplates.Get(tech), cmpPlayer.GetCiv()),
			true));

	let techList = [];
	// Stores the tech which supersedes the key.
	let superseded = {};

	let disabledTechnologies = cmpPlayer.GetDisabledTechnologies();

	// Add any top level technologies to an array which corresponds to the displayed icons.
	// Also store what technology is superseded in the superseded object { "tech1":"techWhichSupercedesTech1", ... }.
	for (let tech of techs)
	{
		if (disabledTechnologies && disabledTechnologies[tech])
			continue;

		let template = TechnologyTemplates.Get(tech);

		// HC-Code: We want to hide some technologies the player can never research because of civ or hero choice made
		// HC-TODO: Not working as intended. Will hide the wrong technologies currently
		//~ if (this.ShouldHideTech(template))
			//~ continue;

		if (!template.supersedes || techs.indexOf(template.supersedes) === -1)
			techList.push(tech);
		else
			superseded[template.supersedes] = tech;
	}

	// Now make researched/in progress techs invisible.
	for (let i in techList)
	{
		let tech = techList[i];
		while (this.IsTechnologyResearchedOrInProgress(tech))
			tech = superseded[tech];

		techList[i] = tech;
	}

	let ret = [];

	// This inserts the techs into the correct positions to line up the technology pairs.
	for (let i = 0; i < techList.length; ++i)
	{
		let tech = techList[i];
		if (!tech)
		{
			ret[i] = undefined;
			continue;
		}

		let template = TechnologyTemplates.Get(tech);
		if (template.top)
			ret[i] = { "pair": true, "top": template.top, "bottom": template.bottom };
		else
			ret[i] = tech;
	}

	return ret;
};

ProductionQueue.prototype.GetTechCostMultiplier = function()
{
	let techCostMultiplier = {};
	for (let res in this.template.TechCostMultiplier)
		techCostMultiplier[res] = ApplyValueModificationsToEntity(
		    "ProductionQueue/TechCostMultiplier/" + res,
		    +this.template.TechCostMultiplier[res],
		    this.entity);

	return techCostMultiplier;
};

ProductionQueue.prototype.IsTechnologyResearchedOrInProgress = function(tech)
{
	if (!tech)
		return false;

	let cmpTechnologyManager = QueryOwnerInterface(this.entity, IID_TechnologyManager);
	if (!cmpTechnologyManager)
		return false;

	let template = TechnologyTemplates.Get(tech);
	if (template.top)
		return cmpTechnologyManager.IsTechnologyResearched(template.top) ||
		    cmpTechnologyManager.IsInProgress(template.top) ||
		    cmpTechnologyManager.IsTechnologyResearched(template.bottom) ||
		    cmpTechnologyManager.IsInProgress(template.bottom);

	return cmpTechnologyManager.IsTechnologyResearched(tech) || cmpTechnologyManager.IsInProgress(tech);
};

/*
 * Adds a new batch of identical units to train or a technology to research to the production queue.
 * @param {string} templateName - The template to start production on.
 * @param {string} type - The type of production (i.e. "unit" or "technology").
 * @param {number} count - The amount of units to be produced. Ignored for a tech.
 * @param {any} metadata - Optionally any metadata to be attached to the item.
 *
 * @return {boolean} - Whether the addition of the item has succeeded.
 */
ProductionQueue.prototype.AddItem = function(templateName, type, count, metadata)
{
	// TODO: there should be a way for the GUI to determine whether it's going
	// to be possible to add a batch (based on resource costs and length limits).
	let cmpPlayer = QueryOwnerInterface(this.entity);
	if (!cmpPlayer)
		return false;
	let player = cmpPlayer.GetPlayerID();

	if (!this.queue.length)
	{
		let cmpUpgrade = Engine.QueryInterface(this.entity, IID_Upgrade);
		if (cmpUpgrade && cmpUpgrade.IsUpgrading())
		{
			let cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
			cmpGUIInterface.PushNotification({
				"players": [player],
				"message": markForTranslation("Entity is being upgraded. Cannot start production."),
				"translateMessage": true
			});
			return false;
		}
	}
	else if (this.queue.length >= this.MaxQueueSize)
	{
		let cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
		cmpGUIInterface.PushNotification({
		    "players": [player],
		    "message": markForTranslation("The production queue is full."),
		    "translateMessage": true,
		});
		return false;
	}

	// ToDo: Lots of duplication here, much can probably be combined,
	// but requires some more refactoring.
	if (type == "unit")
	{
		if (!Number.isInteger(count) || count <= 0)
		{
			error("Invalid batch count " + count);
			return false;
		}

		// Find the template data so we can determine the build costs.
		let cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
		let template = cmpTemplateManager.GetTemplate(this.GetUpgradedTemplate(templateName));
		if (!template)
			return false;

        //HC-code, multiply batch count with the Battalion Size specified
        let initialBatchCount = count; // save the initial batch count reference regardless of battalion size
        if (template.Battalion != undefined)
	        count *= ApplyValueModificationsToTemplate("Battalion/Size", +template.Battalion.Size, cmpPlayer.GetPlayerID(), template);
	
		if (template.Promotion &&
		  !ApplyValueModificationsToTemplate(
		    "Promotion/RequiredXp",
		    +template.Promotion.RequiredXp,
		    cmpPlayer.GetPlayerID(),
		    template))
		{
			this.AddItem(template.Promotion.Entity, type, count, metadata);
			return;
		}

		// We need the costs after tech modifications.
		// Obviously we don't have the entities yet, so we must use template data.
		let costs = {};
		let totalCosts = {};

		for (let res in template.Cost.Resources)
		{
			costs[res] = ApplyValueModificationsToTemplate(
			    "Cost/Resources/" + res,
			    +template.Cost.Resources[res],
			    player,
			    template);

			totalCosts[res] = Math.floor(costs[res]);
		}

		// TrySubtractResources should report error to player (they ran out of resources).
		if (!cmpPlayer.TrySubtractResources(totalCosts))
			return false;

		// Update entity count in the EntityLimits component.
		if (template.TrainingRestrictions)
		{
			let unitCategory = template.TrainingRestrictions.Category;
			let cmpPlayerEntityLimits = QueryPlayerIDInterface(player, IID_EntityLimits);
			if (cmpPlayerEntityLimits)
			{
                cmpPlayerEntityLimits.ChangeCount(unitCategory, initialBatchCount);
				if (template.TrainingRestrictions.MatchLimit)
                    cmpPlayerEntityLimits.ChangeMatchCount(templateName, initialBatchCount);
			}
		}

		let buildTime = ApplyValueModificationsToTemplate(
		    "Cost/BuildTime",
		    +template.Cost.BuildTime,
		    player,
		    template);
    let time = this.GetBatchTime(initialBatchCount) * buildTime * 1000;
		this.queue.push({
			"id": this.nextID++,
			"player": player,
			"unitTemplate": templateName,
			"count": count,
			"metadata": metadata,
			"resources": costs,
			"population": ApplyValueModificationsToTemplate(
			    "Cost/BattalionSlots",		// HC-Code: Population->BattalionSlots
			    +template.Cost.BattalionSlots,	// HC-Code: Population->BattalionSlots
			    player,
			    template),
			"productionStarted": false,
			"timeTotal": time,
			"timeRemaining": time,
	        "batchCount": initialBatchCount
		});

		// Call the related trigger event.
		let cmpTrigger = Engine.QueryInterface(SYSTEM_ENTITY, IID_Trigger);
		cmpTrigger.CallEvent("OnTrainingQueued", {
		    "playerid": player,
		    "unitTemplate": templateName,
		    "count": count,
		    "metadata": metadata,
		    "trainerEntity": this.entity
		});
	}
	else if (type == "technology")
	{
		if (!TechnologyTemplates.Has(templateName))
			return false;

		if (!this.GetTechnologiesList().some(tech =>
			tech &&
				(tech == templateName ||
					tech.pair &&
					(tech.top == templateName || tech.bottom == templateName))))
		{
			error("This entity cannot research " + templateName);
			return false;
		}

		let template = TechnologyTemplates.Get(templateName);
		let techCostMultiplier = this.GetTechCostMultiplier();

		let cost = {};
		if (template.cost)
			for (let res in template.cost)
				cost[res] = Math.floor((techCostMultiplier[res] || 1) * template.cost[res]);

		// TrySubtractResources should report error to player (they ran out of resources).
		if (!cmpPlayer.TrySubtractResources(cost))
			return false;

		// Tell the technology manager that we have started researching this
		// such that players can't research the same thing twice.
		let cmpTechnologyManager = QueryOwnerInterface(this.entity, IID_TechnologyManager);
		cmpTechnologyManager.QueuedResearch(templateName, this.entity);

		let time = techCostMultiplier.time * (template.researchTime || 0) * 1000;
		this.queue.push({
		    "id": this.nextID++,
		    "player": player,
		    "count": 1,
		    "technologyTemplate": templateName,
		    "resources": cost,
		    "productionStarted": false,
		    "timeTotal": time,
		    "timeRemaining": time
		});

		let cmpTrigger = Engine.QueryInterface(SYSTEM_ENTITY, IID_Trigger);
		cmpTrigger.CallEvent("OnResearchQueued", {
		    "playerid": player,
		    "technologyTemplate": templateName,
		    "researcherEntity": this.entity
		});
	}
	else
	{
		warn("Tried to add invalid item of type \"" + type + "\" and template \"" + templateName + "\" to a production queue");
		return false;
	}

	Engine.PostMessage(this.entity, MT_ProductionQueueChanged, null);

	// If this is the first item in the queue, start the timer.
	if (!this.timer)
		this.StartTimer();
	return true;
};

/*
 * Removes an item from the queue.
 * Refunds resource costs and population reservations.
 * item.player is used as this.entity's owner may have changed.
 */
ProductionQueue.prototype.RemoveItem = function(id)
{
	let itemIndex = this.queue.findIndex(item => item.id == id);
	if (itemIndex == -1)
		return;

    let item = this.queue[itemIndex];
    if (item.completed != undefined) // HC-code this item was already completed, cant remove it anymore
        return;

	// Destroy any cached entities (those which didn't spawn for some reason).
	if (item.entityCache && item.entityCache.length)
	{
		for (let ent of item.entityCache)
			Engine.DestroyEntity(ent);

		item.entityCache = [];
	}

	if (item.unitTemplate)
	{
		let cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
		let template = cmpTemplateManager.GetTemplate(item.unitTemplate);
		if (template.TrainingRestrictions)
		{
			let cmpPlayerEntityLimits = QueryPlayerIDInterface(item.player, IID_EntityLimits);
			if (cmpPlayerEntityLimits)
				cmpPlayerEntityLimits.ChangeCount(template.TrainingRestrictions.Category, -item.count);
			if (template.TrainingRestrictions.MatchLimit)
                cmpPlayerEntityLimits.ChangeMatchCount(item.unitTemplate, -item.batchCount);
		}
	}

	let totalCosts = {};
	let cmpStatisticsTracker = QueryPlayerIDInterface(item.player, IID_StatisticsTracker);
	for (let resource in item.resources)
	{
		totalCosts[resource] = Math.floor(item.resources[resource]);
		if (cmpStatisticsTracker)
			cmpStatisticsTracker.IncreaseResourceUsedCounter(resource, -totalCosts[resource]);
	}

	let cmpPlayer = QueryPlayerIDInterface(item.player);
	if (cmpPlayer)
	{
		cmpPlayer.AddResources(totalCosts);
		if (item.productionStarted && item.unitTemplate)
			cmpPlayer.UnReservePopulationSlots(item.population);
		if (itemIndex == 0)
			cmpPlayer.UnBlockTraining();
	}

	if (item.technologyTemplate)
	{
		let cmpTechnologyManager = QueryPlayerIDInterface(item.player, IID_TechnologyManager);
		if (cmpTechnologyManager)
			cmpTechnologyManager.StoppedResearch(item.technologyTemplate, true);
	}

	this.queue.splice(itemIndex, 1);
	Engine.PostMessage(this.entity, MT_ProductionQueueChanged, null);

	if (!this.queue.length)
		this.StopTimer();
};

ProductionQueue.prototype.SetAnimation = function(name)
{
	let cmpVisual = Engine.QueryInterface(this.entity, IID_Visual);
	if (cmpVisual)
		cmpVisual.SelectAnimation(name, false, 1);
};

/*
 * Returns basic data from all batches in the production queue.
 */
ProductionQueue.prototype.GetQueue = function()
{
	return this.queue.map(item => ({
	    "id": item.id,
	    "unitTemplate": item.unitTemplate,
	    "technologyTemplate": item.technologyTemplate,
	    "count": item.count,
	    "neededSlots": item.neededSlots,
	    "progress": 1 - (item.timeRemaining / (item.timeTotal || 1)),
	    "timeRemaining": item.timeRemaining,
        "metadata": item.metadata,
        "resources": item.resources,
        "batchCount": item.batchCount,
        "battalionSlots": item.population
	}));
};

/*
 * Removes all existing batches from the queue.
 */
ProductionQueue.prototype.ResetQueue = function()
{
	// Empty the production queue and refund all the resource costs
	// to the player. (This is to avoid players having to micromanage their
	// buildings' queues when they're about to be destroyed or captured.)
	while (this.queue.length)
		this.RemoveItem(this.queue[0].id);
};

/*
 * Returns batch build time.
 */
ProductionQueue.prototype.GetBatchTime = function(batchSize)
{
	// TODO: work out what equation we should use here.
	return Math.pow(batchSize, ApplyValueModificationsToEntity(
	    "ProductionQueue/BatchTimeModifier",
	    +this.template.BatchTimeModifier,
	    this.entity));
};

ProductionQueue.prototype.OnOwnershipChanged = function(msg)
{
	// Reset the production queue whenever the owner changes.
	// (This should prevent players getting surprised when they capture
	// an enemy building, and then loads of the enemy's civ's soldiers get
	// created from it. Also it means we don't have to worry about
	// updating the reserved pop slots.)
	this.ResetQueue();

	if (msg.to != INVALID_PLAYER)
		this.CalculateEntitiesMap();
};

ProductionQueue.prototype.OnCivChanged = function()
{
	this.CalculateEntitiesMap();
};

/*
 * This function creates the entities and places them in world if possible
 * (some of these entities may be garrisoned directly if autogarrison, the others are spawned).
 * @param {Object} item - The item to spawn units for.
 * @param {number} item.count - The number of entities to spawn.
 * @param {string} item.player - The owner of the item.
 * @param {string} item.unitTemplate - The template to spawn.
 * @param {any} - item.metadata - Optionally any metadata to add to the TrainingFinished message.
 *
 * @return {number} - The number of successfully created entities
 */
ProductionQueue.prototype.SpawnUnits = function(item)
{
	let createdEnts = [];

	// We need entities to test spawning, but we don't want to waste resources,
	// so only create them once and use as needed.
	if (!this.entityCache.length)
		for (let i = 0; i < item.count; ++i)
			this.entityCache.push(Engine.AddEntity(item.unitTemplate));

    //HC-Code: Initiate Hyrule Conquest spawn code
    this.InitiateHyruleSpawn(item, createdEnts);
    
    return createdEnts.length;
};

/*
 * Increments progress on the first item in the production queue and blocks the
 * queue if population limit is reached or some units failed to spawn.
 * @param {Object} data - Unused in this case.
 * @param {number} lateness - The time passed since the expected time to fire the function.
 */
ProductionQueue.prototype.ProgressTimeout = function(data, lateness)
{
	// Check if the production is paused (eg the entity is garrisoned)
	if (this.paused)
		return;

	let cmpPlayer = QueryOwnerInterface(this.entity);
	if (!cmpPlayer)
		return;

	// Allocate available time to as many queue items as it takes
	// until we've used up all the time (so that we work accurately
	// with items that take fractions of a second).
	let time = this.ProgressInterval + lateness;
	let cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);

	while (this.queue.length)
    {
        //HC-code, manually check if this entity was set to completed already
        let item = null;
        for (let queueItem of this.queue)
        {
            if (!queueItem.completed)
            {
                item = queueItem;
                break;
            }
        }

        if (item == null)
            break;
        //HC-end

		if (!item.productionStarted)
		{
			// If the item is a unit then do population checks.
			if (item.unitTemplate)
			{
				// If something change population cost.
				let template = cmpTemplateManager.GetTemplate(item.unitTemplate);
				item.population = ApplyValueModificationsToTemplate(
				    "Cost/BattalionSlots",		//HC-Code: Population->BattalionSlots
				    +template.Cost.BattalionSlots,	//HC-Code: Population->BattalionSlots
				    item.player,
				    template);

				// Batch's training hasn't started yet.
				// Try to reserve the necessary population slots.
                item.neededSlots = cmpPlayer.TryReservePopulationSlots(item.population * item.batchCount);
				if (item.neededSlots)
				{
					// Not enough slots available - don't train this batch now
					// (we'll try again on the next timeout).

					cmpPlayer.BlockTraining();
					return;
				}
				this.SetAnimation("training");

				cmpPlayer.UnBlockTraining();

				Engine.PostMessage(this.entity, MT_TrainingStarted, { "entity": this.entity });
			}

			if (item.technologyTemplate)
			{
				// Mark the research as started.
				let cmpTechnologyManager = QueryOwnerInterface(this.entity, IID_TechnologyManager);
				if (cmpTechnologyManager)
					cmpTechnologyManager.StartedResearch(item.technologyTemplate, true);
				else
					warn("Failed to start researching " + item.technologyTemplate + ": No TechnologyManager available.");

				this.SetAnimation("researching");
			}

			item.productionStarted = true;
		}

		// If we won't finish the batch now, just update its timer.
		if (item.timeRemaining > time)
		{
			item.timeRemaining -= time;
			Engine.PostMessage(this.entity, MT_ProductionQueueChanged, null);
			return;
		}

		if (item.unitTemplate)
		{
			let numSpawned = this.SpawnUnits(item);
			if (numSpawned == item.count)
			{
				cmpPlayer.UnBlockTraining();
				delete this.spawnNotified;
			}
			else
			{
				if (numSpawned)
				{
					item.count -= numSpawned;
					Engine.PostMessage(this.entity, MT_ProductionQueueChanged, null);
				}

				// Some entities failed to spawn.
				// Set flag that training is blocked.
				cmpPlayer.BlockTraining();

				if (!this.spawnNotified)
				{
					let cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
					cmpGUIInterface.PushNotification({
					    "players": [cmpPlayer.GetPlayerID()],
					    "message": markForTranslation("Can't find free space to spawn trained units"),
					    "translateMessage": true
					});
					this.spawnNotified = true;
				}
				return;
			}
		}
		if (item.technologyTemplate)
		{
			let cmpTechnologyManager = QueryOwnerInterface(this.entity, IID_TechnologyManager);
			if (cmpTechnologyManager)
				cmpTechnologyManager.ResearchTechnology(item.technologyTemplate);
			else
				warn("Failed to stop researching " + item.technologyTemplate + ": No TechnologyManager available.");

			this.SetAnimation("idle"); // @EXO: That line is not present in 24. Do you need this? If not, delete
			let template = TechnologyTemplates.Get(item.technologyTemplate);
			if (template && template.soundComplete)
			{
				let cmpSoundManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_SoundManager);
				if (cmpSoundManager)
					cmpSoundManager.PlaySoundGroup(template.soundComplete, this.entity);
            }
            this.queue.shift(); //HC-code, only remove the queue item if it is a technology
		}

        time -= item.timeRemaining;
        // HC-code, we want to keep this train item in the queue until the spawn procedures are finished rather than shifting the queue here already
        //This will keep the trained unit in the queue until it can be removed by the HC spawn procedure itself
        item.completed = true; 
        
		Engine.PostMessage(this.entity, MT_ProductionQueueChanged, null);
		// If autoqueuing, push a new unit on the queue immediately,
		// but don't start right away. This 'wastes' some time, making
		// autoqueue slightly worse than regular queuing, and also ensures
		// that autoqueue doesn't train more than one item per turn,
		// if the units would take fewer than ProgressInterval ms to train.
		if (this.autoqueuing && item.unitTemplate)
		{
			if (!this.AddItem(item.unitTemplate, "unit", item.count, item.metadata))
			{
				this.DisableAutoQueue();
				const cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
				cmpGUIInterface.PushNotification({
					"players": [cmpPlayer.GetPlayerID()],
					"message": markForTranslation("Could not auto-queue unit, de-activating."),
					"translateMessage": true
				});
			}
			break;
		}
	}

	if (!this.queue.length)
		this.StopTimer();
};

ProductionQueue.prototype.PauseProduction = function()
{
	this.StopTimer();
	this.paused = true;
};

ProductionQueue.prototype.UnpauseProduction = function()
{
	delete this.paused;
	this.StartTimer();
};

ProductionQueue.prototype.StartTimer = function()
{
	if (this.timer)
		return;

	this.timer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer).SetInterval(
		this.entity,
		IID_ProductionQueue,
		"ProgressTimeout",
		this.ProgressInterval,
		this.ProgressInterval,
		null
	);
};

ProductionQueue.prototype.StopTimer = function()
{
	if (!this.timer)
		return;

	this.SetAnimation("idle");
	Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer).CancelTimer(this.timer);
	delete this.timer;
};

ProductionQueue.prototype.OnValueModification = function(msg)
{
	// If the promotion requirements of units is changed,
	// update the entities list so that automatically promoted units are shown
	// appropriately in the list.
	if (msg.component != "Promotion" && (msg.component != "ProductionQueue" ||
	        !msg.valueNames.some(val => val.startsWith("ProductionQueue/Entities/"))))
		return;

	if (msg.entities.indexOf(this.entity) === -1)
		return;

	// This also updates the queued production if necessary.
	this.CalculateEntitiesMap();

	// Inform the GUI that it'll need to recompute the selection panel.
	// TODO: it would be better to only send the message if something actually changing
	// for the current production queue.
	let cmpPlayer = QueryOwnerInterface(this.entity);
	if (cmpPlayer)
		Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface).SetSelectionDirty(cmpPlayer.GetPlayerID());
};

ProductionQueue.prototype.HasQueuedProduction = function()
{
	return this.queue.length > 0;
};

ProductionQueue.prototype.OnDisabledTemplatesChanged = function(msg)
{
	// If the disabled templates of the player is changed,
	// update the entities list so that this is reflected there.
	this.CalculateEntitiesMap();
};

/* HC-TODO: This is present in A24 but the message handler is not recognized in HC. We need to add that
ProductionQueue.prototype.OnGarrisonedStateChanged = function(msg)
{
	if (msg.holderID != INVALID_ENTITY)
		this.PauseProduction();
	else
		this.UnpauseProduction();
};
*/
Engine.RegisterComponentType(IID_ProductionQueue, "ProductionQueue", ProductionQueue);
