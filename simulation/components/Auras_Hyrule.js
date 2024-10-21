Auras.prototype.GetTransformations = function(name)
{
	if (AuraTemplates.Get(name).transformations){
		return AuraTemplates.Get(name).transformations
	} else {
		return undefined;
	}
};

Auras.prototype.DoTransformationIfSpecified = function(name, ents)
{
	let transformationsToDo = this.GetTransformations(name);
	if (!transformationsToDo){
		return;
	}
	
	let validEnts = this.GiveMembersWithValidClass(name, ents);
	if (!validEnts.length)
		return;

	let auraType = this.GetType(name);
	if (auraType == "range"){
		this.DoRangedTransformation(name, ents, transformationsToDo);
	}
	if (auraType == "global"){
		this.DoGlobalTransformation(name, ents, transformationsToDo);
	}
	
}

Auras.prototype.DoGlobalTransformation = function(name, ents, transformationsToDo)
{
	for (let transformation of transformationsToDo){
			
		let affectedClass = transformation.class;
		let templateToTransformInto = transformation.transformInto;
		let transformBackAfterAuraFades = transformation.transformBackAfterAuraFades;
		
		// Check each handed over unit if it belongs to that class. If so, transform it.
		let cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
		
		for (let ent of ents){
			
			// Get class of the entity
			let cmpIdentity = Engine.QueryInterface(ent, IID_Identity);
			if (!cmpIdentity){
				continue;
			}
				
			let entityClasses = cmpIdentity.GetClassesList();
			if (MatchesClassList(entityClasses, affectedClass) == false){
				continue;
			}
			
			let transformationElement = new Object();
			transformationElement.newTemplate = templateToTransformInto;
			transformationElement.entityToTransform = ent;
			
			this.entitiesToTransformGlobally.push(transformationElement);
		}
	}
	
	let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
	this.transformationTimerID = cmpTimer.SetInterval(this.entity, IID_Auras, "TransformInBatches", 1, 100, 15);
}
		
Auras.prototype.TransformInBatches = function(batchSize)
{
	let transformBackAfterAuraFails = undefined;
	let templateToTransformInto = undefined;
	
	let cmpPlayer = QueryOwnerInterface(this.entity);
	let playerID = cmpPlayer.GetPlayerID();
	
	for (let i = 0; i < batchSize; i++){
		
		let transformationElement = this.entitiesToTransformGlobally.shift();
		
		if(transformationElement){
			let newEntity = ChangeEntityTemplate(transformationElement.entityToTransform, transformationElement.newTemplate);
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

Auras.prototype.DoRangedTransformation = function(name, ents, transformationsToDo)
{
	for (let transformation of transformationsToDo){
			
		let affectedClass = transformation.class;
		let templateToTransformInto = transformation.transformInto;
		let transformBackAfterSeconds = transformation.transformBackAfterSeconds;
		
		// Check each handed over unit if it belongs to that class. If so, transform it.
		for (let ent of ents){
			
			// Get class of the entity
			let cmpIdentity = Engine.QueryInterface(ent, IID_Identity);
			
			if (!cmpIdentity){
				continue;
			}
				
			let entityClasses = cmpIdentity.GetClassesList();
			if (false == MatchesClassList(entityClasses, affectedClass)){
				continue;
			}
			
			let transformationData = new Object();
			let cmpBattalion = Engine.QueryInterface(ent, IID_Battalion);
			
			transformationData.battalionID = cmpBattalion.ownBattalionID;
			transformationData.templateToTransformInto = templateToTransformInto;
			
	        let cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
			let oldEntityTemplate = cmpTemplateManager.GetCurrentTemplateName(ent);
			
			this.TransformBattalion(transformationData);
			
			if (transformBackAfterSeconds != undefined && transformBackAfterSeconds > 0){
				transformationData.templateToTransformInto = oldEntityTemplate;
				let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
				cmpTimer.SetTimeout(this.entity, IID_Auras, "TransformBattalion", transformBackAfterSeconds*1000, transformationData);
			}
		}
	}
}

// Takes only one argument to make it usable with a timer to transform units back
Auras.prototype.TransformBattalion = function(transformationData)
{
	let battalionID = transformationData.battalionID;
	let templateToTransformInto = transformationData.templateToTransformInto;
	
	let cmpPlayer = QueryOwnerInterface(this.entity);
	if (!cmpPlayer){
		return;
	}
	
	let playerID = cmpPlayer.GetPlayerID();
	if (playerID == 0){
		return;
	}
	
	let etitiesInTheBattalion = cmpPlayer.GetBattalion(battalionID);
	if (etitiesInTheBattalion == undefined){
		return;
	}
		
	let cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
	
	for(let entity of etitiesInTheBattalion){
		let battalionTemplate = cmpTemplateManager.GetCurrentTemplateName(entity);
		
		if (battalionTemplate == templateToTransformInto){
			continue;
		}
		
		let newEntity = ChangeEntityTemplate(entity, templateToTransformInto);
		QueryPlayerIDInterface(playerID).ReplaceBattalionEntity(entity, newEntity);
	}
}
