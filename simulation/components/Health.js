function Health() {}

Health.prototype.Schema =
	"<a:help>Deals with hitpoints and death.</a:help>" +
	"<a:example>" +
		"<Max>100</Max>" +
		"<RegenRate>1.0</RegenRate>" +
		"<IdleRegenRate>0</IdleRegenRate>" +
		"<DeathType>corpse</DeathType>" +
	"</a:example>" +
	"<element name='Max' a:help='Maximum hitpoints'>" +
		"<ref name='nonNegativeDecimal'/>" +
	"</element>" +
	// HC-Code
	"<optional>" +
		"<element name='TransformAfterCreation' a:help='Upgrades the structure after X seconds into an other one'>" +
			"<element name='TemplateToTransformInto' a:help='the template the unit will transform into'><text/></element>" +
			"<element name='TransformAfterSeconds' a:help='Transform into the given template after X seconds'><ref name='nonNegativeDecimal'/></element>" +
		"</element>" +
	"</optional>" +
	// HC-End
	"<optional>" +
		"<element name='Initial' a:help='Initial hitpoints. Default if unspecified is equal to Max'>" +
			"<ref name='nonNegativeDecimal'/>" +
		"</element>" +
	"</optional>" +
	"<optional>" +
		"<element name='DamageVariants'>" +
			"<oneOrMore>" +
				"<element a:help='Name of the variant to select when health drops under the defined ratio'>" +
					"<anyName/>" +
					"<data type='decimal'>" +
						"<param name='minInclusive'>0</param>" +
						"<param name='maxInclusive'>1</param>" +
					"</data>" +
				"</element>" +
			"</oneOrMore>" +
		"</element>" +
	"</optional>" +
	"<element name='RegenRate' a:help='Hitpoint regeneration rate per second.'>" +
		"<data type='decimal'/>" +
	"</element>" +
	"<element name='IdleRegenRate' a:help='Hitpoint regeneration rate per second when idle or garrisoned.'>" +
		"<data type='decimal'/>" +
	"</element>" +
	"<element name='DeathType' a:help='Behaviour when the unit dies'>" +
		"<choice>" +
			"<value a:help='Disappear instantly'>vanish</value>" +
			"<value a:help='Turn into a corpse'>corpse</value>" +
			"<value a:help='Remain in the world with 0 health'>remain</value>" +
		"</choice>" +
	"</element>" +
	"<optional>" +
		"<element name='SpawnEntityOnDeath' a:help='Entity template to spawn when this entity dies. Note: this is different than the corpse, which retains the original entity&apos;s appearance'>" +
			"<text/>" +
		"</element>" +
	"</optional>" +
    // HC-Code
    "<optional>" +
        "<element name='SpawnMultipleEntitiesOnDeath'>" +
        "<interleave>" +
            "<element name='Template' a:help='the template that will be spawned'><text/></element>" +
            "<element name='Chance' a:help='Chance it will spawn from 1-100'><ref name='nonNegativeDecimal'/></element>" +
            "<element name='SpawnNumberMin' a:help='The min number of spawns.'><data type='positiveInteger'/></element>" +
            "<element name='SpawnNumberMax' a:help='The max number of spawns.'><data type='positiveInteger'/></element>" +
	    "<optional>" +
		    "<element name='BattalionSize' a:help='The max number of spawns.'><data type='positiveInteger'/></element>" +
	    "</optional>" +
	    "<optional>" +
		    "<element name='DoNotSetCustomBattalionSize' a:help='The max number of spawns.'><data type='boolean'/></element>" +
	    "</optional>" +
	    "<optional>" +
		    "<element name='SameBattalion' a:help='The max number of spawns.'><data type='boolean'/></element>" +
	    "</optional>" +
	    "<optional>" +
		    "<element name='ConsumeBattalionSlots' a:help='The max number of spawns.'><data type='boolean'/></element>" +
	    "</optional>" +
            "<optional>" +
                "<element name='OwnerID' a:help='Which owner it should belong to.'><ref name='nonNegativeDecimal'/></element>" +
            "</optional>" +	
        "</interleave>" +
        "</element>" +
    "</optional>" +
    "<optional>" +
        "<element name='SpawnOnInterval'>" +
            "<oneOrMore>" +
                "<element>" +
                    "<anyName/>" +
                    "<interleave>" +
                        "<element name='Template' a:help='the template that will be spawned'><text/></element>" +
                        "<element name='Max' a:help='The max number that can be present with spawning'><data type='nonNegativeInteger'/></element>" +
                        "<element name='StartDelay' a:help='the initial delay until the first interval'><data type='nonNegativeInteger'/></element>" +
                        "<element name='Interval' a:help='the interval time in miliseconds'><data type='positiveInteger'/></element>" +
                        "<element name='SpawnNumber' a:help='The amount spawned per interval'><data type='positiveInteger'/></element>" +
                        "<element name='LinkedDestruction' a:help='whether the destruction of the component holder will result in the death of the spawned units'><data type='boolean'/></element>" +
						"<optional>" +
							"<element name='OwnerID' a:help='Which owner it should belong to.'><ref name='nonNegativeDecimal'/></element>" +
						"</optional>" +	
                    "</interleave>" +
                "</element >" +
            "</oneOrMore>" +
		"</element >" +	
    "</optional>" +
    "<optional>" +
        "<element name='SpawnGarrison'>" +
        "<interleave>" +
            "<element name='Template' a:help='the template that will be spawned'><text/></element>" +
            "<element name='SpawnNumber' a:help='The amount spawned per interval'><data type='positiveInteger'/></element>" +
            "<element name='LinkedDestruction' a:help='whether the destruction of the component holder will result in the death of the spawned units'><data type='boolean'/></element>" +
        "</interleave>" +
        "</element>" +
    "</optional>" +
    // HC-End
	"<element name='Unhealable' a:help='Indicates that the entity can not be healed by healer units'>" +
		"<data type='boolean'/>" +
	"</element>";

Health.prototype.Init = function()
{
	// Cache this value so it allows techs to maintain previous health level
	this.maxHitpoints = +this.template.Max;
	// Default to <Initial>, but use <Max> if it's undefined or zero
	// (Allowing 0 initial HP would break our death detection code)
	this.hitpoints = +(this.template.Initial || this.GetMaxHitpoints());
	this.regenRate = ApplyValueModificationsToEntity("Health/RegenRate", +this.template.RegenRate, this.entity);
	this.idleRegenRate = ApplyValueModificationsToEntity("Health/IdleRegenRate", +this.template.IdleRegenRate, this.entity);
	this.CheckRegenTimer();
	this.UpdateActor();

	// HC-Code
	this.InitHyrule();
};

/**
 * Returns the current hitpoint value.
 * This is 0 if (and only if) the unit is dead.
 */
Health.prototype.GetHitpoints = function()
{
	return this.hitpoints;
};

Health.prototype.GetMaxHitpoints = function()
{
	return this.maxHitpoints;
};

/**
 * @return {boolean} Whether the units are injured. Dead units are not considered injured.
 */
Health.prototype.IsInjured = function()
{
	return this.hitpoints > 0 && this.hitpoints < this.GetMaxHitpoints();
};

Health.prototype.SetHitpoints = function(value)
{
	// If we're already dead, don't allow resurrection
	if (this.hitpoints == 0)
		return;

	// Before changing the value, activate Fogging if necessary to hide changes
	let cmpFogging = Engine.QueryInterface(this.entity, IID_Fogging);
	if (cmpFogging)
		cmpFogging.Activate();

	let old = this.hitpoints;
	this.hitpoints = Math.max(1, Math.min(this.GetMaxHitpoints(), value));

	let cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
	if (cmpRangeManager)
		cmpRangeManager.SetEntityFlag(this.entity, "injured", this.IsInjured());

	this.RegisterHealthChanged(old);
};

Health.prototype.IsRepairable = function()
{
	let cmpRepairable = Engine.QueryInterface(this.entity, IID_Repairable);
	return cmpRepairable && cmpRepairable.IsRepairable();
};

Health.prototype.IsUnhealable = function()
{
	return this.template.Unhealable == "true" ||
		this.hitpoints <= 0 || !this.IsInjured();
};

Health.prototype.GetIdleRegenRate = function()
{
	return this.idleRegenRate;
};

Health.prototype.GetRegenRate = function()
{
	return this.regenRate;
};

Health.prototype.ExecuteRegeneration = function()
{
	let regen = this.GetRegenRate();
	if (this.GetIdleRegenRate() != 0)
	{
		let cmpUnitAI = Engine.QueryInterface(this.entity, IID_UnitAI);
		if (cmpUnitAI && cmpUnitAI.IsIdle())
			regen += this.GetIdleRegenRate();
	}

	if (regen > 0)
		this.Increase(regen);
	else
		this.Reduce(-regen);
};

/*
 * Check if the regeneration timer needs to be started or stopped
 */
Health.prototype.CheckRegenTimer = function()
{
	// check if we need a timer
	if (this.GetRegenRate() == 0 && this.GetIdleRegenRate() == 0 ||
	    !this.IsInjured() && this.GetRegenRate() >= 0 && this.GetIdleRegenRate() >= 0 ||
	    this.hitpoints == 0)
	{
		// we don't need a timer, disable if one exists
		if (this.regenTimer)
		{
			let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
			cmpTimer.CancelTimer(this.regenTimer);
			this.regenTimer = undefined;
		}
		return;
	}

	// we need a timer, enable if one doesn't exist
	if (this.regenTimer)
		return;

	let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
	this.regenTimer = cmpTimer.SetInterval(this.entity, IID_Health, "ExecuteRegeneration", 1000, 1000, null);
};

Health.prototype.Kill = function()
{
	this.Reduce(this.hitpoints);
};

/**
 * @param {number} amount - The amount of damage to be taken.
 * @param {number} attacker - The entityID of the attacker.
 * @param {number} attackerOwner - The playerID of the owner of the attacker.
 *
 * @eturn {Object} - Object of the form { "healthChange": number }.
 */
Health.prototype.TakeDamage = function(amount, attacker, attackerOwner)
{
	if (!amount || !this.hitpoints)
		return { "healthChange": 0 };

	let change = this.Reduce(amount);

	let cmpLoot = Engine.QueryInterface(this.entity, IID_Loot);
	if (cmpLoot && cmpLoot.GetXp() > 0 && change.healthChange < 0)
		change.xp = cmpLoot.GetXp() * -change.healthChange / this.GetMaxHitpoints();

	if (!this.hitpoints)
		this.KilledBy(attacker, attackerOwner);

	return change;
};

/**
 * Called when an entity kills us.
 * @param {number} attacker - The entityID of the killer.
 * @param {number} attackerOwner - The playerID of the attacker.
 */
Health.prototype.KilledBy = function(attacker, attackerOwner)
{
	let cmpAttackerOwnership = Engine.QueryInterface(attacker, IID_Ownership);
	if (cmpAttackerOwnership)
	{
		let currentAttackerOwner = cmpAttackerOwnership.GetOwner();
		if (currentAttackerOwner != INVALID_PLAYER)
			attackerOwner = currentAttackerOwner;
	}

	// Add to killer statistics.
	let cmpKillerPlayerStatisticsTracker = QueryPlayerIDInterface(attackerOwner, IID_StatisticsTracker);
	if (cmpKillerPlayerStatisticsTracker)
		cmpKillerPlayerStatisticsTracker.KilledEntity(this.entity);

	// Add to loser statistics.
	let cmpTargetPlayerStatisticsTracker = QueryOwnerInterface(this.entity, IID_StatisticsTracker);
	if (cmpTargetPlayerStatisticsTracker)
		cmpTargetPlayerStatisticsTracker.LostEntity(this.entity);

	let cmpLooter = Engine.QueryInterface(attacker, IID_Looter);
	if (cmpLooter)
		cmpLooter.Collect(this.entity);
};

/**
 * @param {number} amount - The amount of hitpoints to substract. Kills the entity if required.
 * @return {{ healthChange:number }} -  Number of health points lost.
 */
 // HC-Code: Add attacker as function argument
Health.prototype.Reduce = function(amount, attacker = null)
{
	// If we are dead, do not do anything
	// (The entity will exist a little while after calling DestroyEntity so this
	// might get called multiple times)
	// Likewise if the amount is 0.
	if (!amount || !this.hitpoints)
		return { "healthChange": 0 };

	// Before changing the value, activate Fogging if necessary to hide changes
	let cmpFogging = Engine.QueryInterface(this.entity, IID_Fogging);
	if (cmpFogging)
		cmpFogging.Activate();

	let oldHitpoints = this.hitpoints;
	// If we reached 0, then die.
	if (amount >= this.hitpoints)
	{
		this.hitpoints = 0;
		this.RegisterHealthChanged(oldHitpoints);
		this.HandleDeath(attacker); // HC-Code: Add attacker as argument
		return { "healthChange": -oldHitpoints };
	}

	// If we are not marked as injured, do it now
	if (!this.IsInjured())
	{
		let cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
		if (cmpRangeManager)
			cmpRangeManager.SetEntityFlag(this.entity, "injured", true);
	}

	this.hitpoints -= amount;
	this.RegisterHealthChanged(oldHitpoints);
	return { "healthChange": this.hitpoints - oldHitpoints };
};

/**
 * Handle what happens when the entity dies.
 */
 // HC-Code: Add Attacker as Argument
Health.prototype.HandleDeath = function(attacker = null)
{
	let cmpDeathDamage = Engine.QueryInterface(this.entity, IID_DeathDamage);
	if (cmpDeathDamage)
		cmpDeathDamage.CauseDeathDamage();
	PlaySound("death", this.entity);

	//HC-code make death events possible for map triggers
	let cmpTrigger = Engine.QueryInterface(SYSTEM_ENTITY, IID_Trigger);
	cmpTrigger.CallEvent("OnEntityDeath", { ent: this.entity });

	if (this.template.SpawnEntityOnDeath){
		//HC-Code. We need to store the corpse to limit corpse numbers on the field
		let corpse = this.CreateDeathSpawnedEntity();
		let cmpPlayer = QueryOwnerInterface(corpse);
		cmpPlayer.corpses.push(corpse); // add this corpse to the list
		cmpPlayer.CheckDestroyCorpse(); // attempt to destroy the oldest corpse
	}

	// HC-Code
	if (this.template.SpawnMultipleEntitiesOnDeath)
		this.SpawnEntitiesOnDeath();

	// HC-Code: PLOT mechanic
	let cmpPlots = Engine.QueryInterface(this.entity, IID_Plots);
	if (cmpPlots){
		    cmpPlots.CheckPlotInvolvement(); // checks for plot involvement and acts accordingly  
	}
	
	//HC-Code
	this.CheckGarrisonSpawnInvolvement(); // checks for Garrison Spawn involvement and acts accordingly 
	this.CheckIntervalSpawnInvolvement(); // checks for Interval Spawn involvement and acts accordingly 
	this.CheckProductionSpawningState(); // check if this entity was in the process of producing entities and act accordingly
	this.UpdateBattalionStatus(); // remove this entity from its battalion if applicable and update the battalion map accordingly

	switch (this.template.DeathType)
	{
	case "corpse":
		// HC-Code: We want to do something with the corpses
		// Limitter and death blow animation
		let corpse = this.CreateCorpse(attacker);
		let cmpPlayer = QueryOwnerInterface(corpse);

		let cmpIdentity = Engine.QueryInterface(corpse, IID_Identity);
		if(cmpIdentity.HasClass("LiveStock")) break;
		
		cmpPlayer.corpses.push(corpse); // add this corpse to the list
		cmpPlayer.CheckDestroyCorpse(); // attempt to destroy the oldest corpse
		break;

	case "remain":
		return;

	case "vanish":
		break;

	default:
		error("Invalid template.DeathType: " + this.template.DeathType);
		break;
	}

	Engine.DestroyEntity(this.entity);
};

Health.prototype.Increase = function(amount)
{
	// Before changing the value, activate Fogging if necessary to hide changes
	let cmpFogging = Engine.QueryInterface(this.entity, IID_Fogging);
	if (cmpFogging)
		cmpFogging.Activate();

	if (!this.IsInjured())
		return { "old": this.hitpoints, "new": this.hitpoints };

	// If we're already dead, don't allow resurrection
	if (this.hitpoints == 0)
		return undefined;

	let old = this.hitpoints;
	this.hitpoints = Math.min(this.hitpoints + amount, this.GetMaxHitpoints());

	if (!this.IsInjured())
	{
		let cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
		if (cmpRangeManager)
			cmpRangeManager.SetEntityFlag(this.entity, "injured", false);
	}

	this.RegisterHealthChanged(old);

	return { "old": old, "new": this.hitpoints };
};

//HC-Code: Added function arguments: attacker
Health.prototype.CreateCorpse = function(attacker)
{
	// If the unit died while not in the world, don't create any corpse for it
	// since there's nowhere for the corpse to be placed.
	let cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	if (!cmpPosition || !cmpPosition.IsInWorld())
		return;

	// Either creates a static local version of the current entity, or a
	// persistent corpse retaining the ResourceSupply element of the parent.
	let templateName = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager).GetCurrentTemplateName(this.entity);

	let entCorpse;
	let cmpResourceSupply = Engine.QueryInterface(this.entity, IID_ResourceSupply);
	let resource = cmpResourceSupply && cmpResourceSupply.GetKillBeforeGather();
	if (resource)
		entCorpse = Engine.AddEntity("resource|" + templateName);
	else
		entCorpse = Engine.AddLocalEntity("corpse|" + templateName);

	// Copy various parameters so it looks just like us.
	let cmpPositionCorpse = Engine.QueryInterface(entCorpse, IID_Position);
	let pos = cmpPosition.GetPosition();
	cmpPositionCorpse.JumpTo(pos.x, pos.z);
	let rot = cmpPosition.GetRotation();
	cmpPositionCorpse.SetYRotation(rot.y);
	cmpPositionCorpse.SetXZRotation(rot.x, rot.z);

	let cmpOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
	let cmpOwnershipCorpse = Engine.QueryInterface(entCorpse, IID_Ownership);
	if (cmpOwnership && cmpOwnershipCorpse)
		cmpOwnershipCorpse.SetOwner(cmpOwnership.GetOwner());

	let cmpVisualCorpse = Engine.QueryInterface(entCorpse, IID_Visual);
	if (cmpVisualCorpse)
	{
		let cmpVisual = Engine.QueryInterface(this.entity, IID_Visual);
		if (cmpVisual)
			cmpVisualCorpse.SetActorSeed(cmpVisual.GetActorSeed());

  										
		// HC-Code: attempt to play a kill animation for the attacker
	    let deathblowAnimation = this.GetDeathblowAnimation(attacker);
	    if (deathblowAnimation != undefined)
	    {
	        deathblowAnimation.unitAI.Deathblow(deathblowAnimation.data);
	        var counterData = deathblowAnimation.counterData;
	    }
	
		// HC-Code: Make it fall over
	    if (counterData == undefined) // play counter animation if provided
	        cmpVisualCorpse.SelectAnimation("death", true, 1); // Vanilla 0ad line
	    else
	        cmpVisualCorpse.SelectAnimation(counterData.animationName, true, counterData.speed);
	}

	// HC-EXO: That if statement is new. Maybe you need to adapt your deathblow code. I have no idea
    // Not sure what RecomputeActorName and SetPhenotype does yet, but will look into it later as Deathblow isnt really in use yet anyway
	const cmpIdentityCorpse = Engine.QueryInterface(entCorpse, IID_Identity);
	if (cmpIdentityCorpse)
	{
		const cmpIdentity = Engine.QueryInterface(this.entity, IID_Identity);
		if (cmpIdentity)
		{
			const oldPhenotype = cmpIdentity.GetPhenotype();
			if (cmpIdentityCorpse.GetPhenotype() !== oldPhenotype)
			{
				cmpIdentityCorpse.SetPhenotype(oldPhenotype);
				if (cmpVisualCorpse)
					cmpVisualCorpse.RecomputeActorName();
			}
		}
	}

	if (resource)
		Engine.PostMessage(this.entity, MT_EntityRenamed, {
			"entity": this.entity,
			"newentity": entCorpse
		});

	// HC-Code
	return entCorpse;
};

Health.prototype.CreateDeathSpawnedEntity = function()
{
	// If the unit died while not in the world, don't spawn a death entity for it
	// since there's nowhere for it to be placed
	let cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	if (!cmpPosition.IsInWorld())
		return INVALID_ENTITY;

	// Create SpawnEntityOnDeath entity
	let spawnedEntity = Engine.AddLocalEntity(this.template.SpawnEntityOnDeath);

	// Move to same position
	let cmpSpawnedPosition = Engine.QueryInterface(spawnedEntity, IID_Position);
	let pos = cmpPosition.GetPosition();
	cmpSpawnedPosition.JumpTo(pos.x, pos.z);
	let rot = cmpPosition.GetRotation();
	cmpSpawnedPosition.SetYRotation(rot.y);
	cmpSpawnedPosition.SetXZRotation(rot.x, rot.z);

	let cmpOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
	let cmpSpawnedOwnership = Engine.QueryInterface(spawnedEntity, IID_Ownership);
	if (cmpOwnership && cmpSpawnedOwnership)
		cmpSpawnedOwnership.SetOwner(cmpOwnership.GetOwner());

	return spawnedEntity;
};

Health.prototype.UpdateActor = function()
{
	if (!this.template.DamageVariants)
		return;
	let ratio = this.hitpoints / this.GetMaxHitpoints();
	let newDamageVariant = "alive";
	if (ratio > 0)
	{
		let minTreshold = 1;
		for (let key in this.template.DamageVariants)
		{
			let treshold = +this.template.DamageVariants[key];
			if (treshold < ratio || treshold > minTreshold)
				continue;
			newDamageVariant = key;
			minTreshold = treshold;
		}
	}
	else
		newDamageVariant = "death";

	if (this.damageVariant && this.damageVariant == newDamageVariant)
		return;

	this.damageVariant = newDamageVariant;

	let cmpVisual = Engine.QueryInterface(this.entity, IID_Visual);
	if (cmpVisual)
		cmpVisual.SetVariant("health", newDamageVariant);
};

Health.prototype.RecalculateValues = function()
{
	let oldMaxHitpoints = this.GetMaxHitpoints();
	let newMaxHitpoints = ApplyValueModificationsToEntity("Health/Max", +this.template.Max, this.entity);
	if (oldMaxHitpoints != newMaxHitpoints)
	{
		let newHitpoints = this.hitpoints * newMaxHitpoints/oldMaxHitpoints;
		this.maxHitpoints = newMaxHitpoints;
		this.SetHitpoints(newHitpoints);
	}

	let oldRegenRate = this.regenRate;
	this.regenRate = ApplyValueModificationsToEntity("Health/RegenRate", +this.template.RegenRate, this.entity);

	let oldIdleRegenRate = this.idleRegenRate;
	this.idleRegenRate = ApplyValueModificationsToEntity("Health/IdleRegenRate", +this.template.IdleRegenRate, this.entity);

	if (this.regenRate != oldRegenRate || this.idleRegenRate != oldIdleRegenRate)
		this.CheckRegenTimer();
};

Health.prototype.OnValueModification = function(msg)
{
	if (msg.component == "Health")
		this.RecalculateValues();
};

Health.prototype.OnOwnershipChanged = function(msg)
{
	if (msg.to != INVALID_PLAYER)
		this.RecalculateValues();
};

Health.prototype.RegisterHealthChanged = function(from)
{
	this.CheckRegenTimer();
	this.UpdateActor();

	// HC-Code
	let cmpTrigger = Engine.QueryInterface(SYSTEM_ENTITY, IID_Trigger);
	cmpTrigger.CallEvent("OnHealthChanged", { entity: this.entity, HP: this.hitpoints }); //HC-code make health events possible for map triggers
	
	Engine.PostMessage(this.entity, MT_HealthChanged, { "from": from, "to": this.hitpoints });

	//HC-Code: Makes the health accessible to the battalion selection UI
	var cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
	let cmpEntityPlayer = QueryOwnerInterface(this.entity);
	let playerID = cmpEntityPlayer.GetPlayerID();
	cmpGUIInterface.ProcessHealthChanged(playerID, this.entity, this.hitpoints);
};

function HealthMirage() {}
HealthMirage.prototype.Init = function(cmpHealth)
{
	this.maxHitpoints = cmpHealth.GetMaxHitpoints();
	this.hitpoints = cmpHealth.GetHitpoints();
	this.repairable = cmpHealth.IsRepairable();
	this.injured = cmpHealth.IsInjured();
	this.unhealable = cmpHealth.IsUnhealable();
};
HealthMirage.prototype.GetMaxHitpoints = function() { return this.maxHitpoints; };
HealthMirage.prototype.GetHitpoints = function() { return this.hitpoints; };
HealthMirage.prototype.IsRepairable = function() { return this.repairable; };
HealthMirage.prototype.IsInjured = function() { return this.injured; };
HealthMirage.prototype.IsUnhealable = function() { return this.unhealable; };

Engine.RegisterGlobal("HealthMirage", HealthMirage);

Health.prototype.Mirage = function()
{
	let mirage = new HealthMirage();
	mirage.Init(this);
	return mirage;
};

Engine.RegisterComponentType(IID_Health, "Health", Health);
