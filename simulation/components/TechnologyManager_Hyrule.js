TechnologyManager.prototype.transformationList = [];
TechnologyManager.prototype.transformationTimerID = undefined;

// Starting from A24 you need to explicitely serialize stuff.
TechnologyManager.prototype.Serialize = function()
{
	let state = {};
	for (let key in this)
		if (this.hasOwnProperty(key))
			state[key] = this[key];

	return state;
};

TechnologyManager.prototype.Deserialize = function(state)
{
	for (let prop in state)
		this[prop] = state[prop];
};


TechnologyManager.prototype.GetCivData = function (civ)
{
	let rawCivData = Engine.ReadJSONFile("simulation/data/civs/" + civ + ".json");
	return rawCivData && rawCivData.CivChoices ? rawCivData.CivChoices :  {};
};

// Workaround to make multiple technology requirements working. USe as long as it's not in the official 0ad code
TechnologyManager.prototype.ResearchTechnologWithMultipleDependencies = function (template)
{
	let researchInSuccession = template.researchInSuccession;
	if (!researchInSuccession){
		return;
	}

	let researchTechnology = true;
	// Check each technology that can be researched in succesion. If all are requirements are met, research the specified tech
	for (let technologyToCheck of researchInSuccession){
		researchTechnology = true;

		for(let requirement of technologyToCheck.requirements){
			if (!this.researchedTechs.has(requirement)){
				researchTechnology = false;
				break;
			}
		}

		if(researchTechnology == true && !this.researchedTechs.has(technologyToCheck.technologyToResearch)){
			this.ResearchTechnology(technologyToCheck.technologyToResearch);
		}
	}
}

// Is calld by a timer and does transform all units in this.transformationList in batches to reduce lag
TechnologyManager.prototype.transformInBatches = function (batchSize)
{

	let cmpPlayer = Engine.QueryInterface(this.entity, IID_Player);
	let playerID = cmpPlayer.GetPlayerID();

	for (let i = 0; i < batchSize; i ++ ){
		let transformationElement = this.transformationList.shift();

		if(transformationElement){
		let newEntity = ChangeEntityTemplate(transformationElement.entityToTransform, transformationElement.templateToTransformInto);
		QueryPlayerIDInterface(playerID).ReplaceBattalionEntity(transformationElement.entityToTransform, newEntity);

		//Play cheer animation
		let cmpPromotedUnitAI = Engine.QueryInterface(transformationElement.entityToTransform, IID_UnitAI);
		cmpPromotedUnitAI.Cheer();

		} else{
			var cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
			cmpTimer.CancelTimer(this.transformationTimerID);
			return;
		}
	}
}

// Function to handle automatically upgrade entities, if "upgrades" is defined in the template
TechnologyManager.prototype.DoUpgradesIfSpecified = function(template)
{
	let upgradesToDo = template.upgrades;
	if (!upgradesToDo){
		return;
	}

	var cmpPlayer = Engine.QueryInterface(this.entity, IID_Player);
	if (!cmpPlayer || cmpPlayer.GetPlayerID() === undefined)
		return;
	var playerID = cmpPlayer.GetPlayerID();

	let cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
	let entities = cmpRangeManager.GetEntitiesByPlayer(playerID);


	// Iterate through all transformations specified in the technology json
	for (let upgrade of upgradesToDo){


		let affectedClass = upgrade.class;
		let templateToUpgradeTo = upgrade.upgradeTo;

		// Store all data in one data structure to hand it over to a timer
		// Check each player unit if it belongs to that class. If so, transform it.
		for (let entity of entities){

			// Get classes of the entity
			let cmpIdentity = Engine.QueryInterface(entity, IID_Identity);
			if (!cmpIdentity){
				continue;
			}

			let entityClasses = cmpIdentity.GetClassesList();

			if (MatchesClassList(entityClasses, affectedClass)){
				warn("Upgrading ID: " + entity + " Template: " + templateToUpgradeTo);
				let cmpUpgrade = Engine.QueryInterface(entity, IID_Upgrade);
				cmpUpgrade.Upgrade(templateToUpgradeTo, false);
			}
		}
	}
}


/**
 * Transforms units if "transformations" exist inside the technology.json description
 * @param {object} template
 */
TechnologyManager.prototype.DoTransformationsIfSpecified = function(template)
{
	if (!template.transformations){
		return;
	}

	var cmpPlayer = Engine.QueryInterface(this.entity, IID_Player);
	if (!cmpPlayer || cmpPlayer.GetPlayerID() === undefined)
		return;
	var playerID = cmpPlayer.GetPlayerID();

	let cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
	let entities = cmpRangeManager.GetEntitiesByPlayer(playerID);

	// Iterate through all transformations specified in the technology json
	let transformationsToDo = template.transformations;
	for (let transformation of transformationsToDo){


		let affectedClass = transformation.class
		let templateToTransformInto = transformation.transformInto

		// Store all data in one data structure to hand it over to a timer
		// Check each player unit if it belongs to that class. If so, transform it.
		for (let ent of entities){

			// Get class of the entity
			let cmpIdentity = Engine.QueryInterface(ent, IID_Identity);
			if (!cmpIdentity){
				continue;
			}

			let entityClasses = cmpIdentity.GetClassesList();

			if (MatchesClassList(entityClasses, affectedClass)){
				let transformationEntry = new Object();
				transformationEntry.affectedClass = affectedClass;
				transformationEntry.templateToTransformInto = templateToTransformInto;
				transformationEntry.entityToTransform = ent;
				this.transformationList.push(transformationEntry);
			}
		}
	}

	// Create the timer for the transformation
	var cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
	this.transformationTimerID = cmpTimer.SetInterval(this.entity, IID_TechnologyManager, "transformInBatches", 1, 100, 10);

}
