/**
 * Provides attack and damage-related helpers.
 */
function AttackHelper() {}

const DirectEffectsSchema =
	"<element name='Damage'>" +
		"<oneOrMore>" +
			"<element a:help='One or more elements describing damage types'>" +
				"<anyName/>" +
				"<ref name='nonNegativeDecimal' />" +
			"</element>" +
		"</oneOrMore>" +
	"</element>" +
	"<element name='Capture' a:help='Capture points value'>" +
		"<ref name='nonNegativeDecimal'/>" +
	"</element>";

const StatusEffectsSchema =
	"<element name='ApplyStatus' a:help='Effects like poisoning or burning a unit.'>" +
		"<oneOrMore>" +
			"<element>" +
				"<anyName a:help='The name must have a matching JSON file in data/status_effects.'/>" +
				"<interleave>" +
					"<optional>" +
						"<element name='Duration' a:help='The duration of the status while the effect occurs.'><ref name='nonNegativeDecimal'/></element>" +
					"</optional>" +
					"<optional>" +
						"<interleave>" +
							"<element name='Interval' a:help='Interval between the occurances of the effect.'><ref name='nonNegativeDecimal'/></element>" +
							"<oneOrMore>" +
								"<choice>" +
									DirectEffectsSchema +
								"</choice>" +
							"</oneOrMore>" +
						"</interleave>" +
					"</optional>" +
					"<optional>" +
						ModificationsSchema +
					"</optional>" +
					"<element name='Stackability' a:help='Defines how this status effect stacks, i.e. how subsequent status effects of the same kind are handled. Choices are: “Ignore”, which means a new one is ignored, “Extend”, which means the duration of a new one is added to the already active status effect, “Replace”, which means the currently active status effect is removed and the new one is put in place and “Stack”, which means that the status effect can be added multiple times.'>" +
						"<choice>" +
							"<value>Ignore</value>" +
							"<value>Extend</value>" +
							"<value>Replace</value>" +
							"<value>Stack</value>" +
						"</choice>" +
					"</element>" +
				"</interleave>" +
			"</element>" +
		"</oneOrMore>" +
	"</element>";

/**
 * Builds a RelaxRNG schema of possible attack effects.
 * See globalscripts/AttackEffects.js for possible elements.
 * Attacks may also have a "Bonuses" element.
 *
 * @return {string} - RelaxNG schema string.
 */
AttackHelper.prototype.BuildAttackEffectsSchema = function()
{
	return "" +
	"<oneOrMore>" +
		"<choice>" +
			DirectEffectsSchema +
			StatusEffectsSchema +
		"</choice>" +
	"</oneOrMore>" +
	"<optional>" +
		"<element name='Bonuses'>" +
			"<zeroOrMore>" +
				"<element>" +
					"<anyName/>" +
					"<interleave>" +
						"<optional>" +
							"<element name='Civ' a:help='If an entity has this civ then the bonus is applied'><text/></element>" +
						"</optional>" +
						"<element name='Classes' a:help='If an entity has all these classes then the bonus is applied'><text/></element>" +
						"<element name='Multiplier' a:help='The effect strength is multiplied by this'><ref name='nonNegativeDecimal'/></element>" +
					"</interleave>" +
				"</element>" +
			"</zeroOrMore>" +
		"</element>" +
	"</optional>";
};

/**
 * Returns a template-like object of attack effects.
 */
AttackHelper.prototype.GetAttackEffectsData = function(valueModifRoot, template, entity)
{
	let ret = {};

	if (template.Damage)
	{
		ret.Damage = {};
		let applyMods = damageType =>
			ApplyValueModificationsToEntity(valueModifRoot + "/Damage/" + damageType, +(template.Damage[damageType] || 0), entity);
		for (let damageType in template.Damage)
			ret.Damage[damageType] = applyMods(damageType);
	}
	if (template.Capture)
		ret.Capture = ApplyValueModificationsToEntity(valueModifRoot + "/Capture", +(template.Capture || 0), entity);

	if (template.ApplyStatus)
		ret.ApplyStatus = this.GetStatusEffectsData(valueModifRoot, template.ApplyStatus, entity);

	if (template.Bonuses)
		ret.Bonuses = template.Bonuses;

	return ret;
};

AttackHelper.prototype.GetStatusEffectsData = function(valueModifRoot, template, entity)
{
	let result = {};
	for (let effect in template)
	{
		let statusTemplate = template[effect];
		result[effect] = {
			"Duration": ApplyValueModificationsToEntity(valueModifRoot + "/ApplyStatus/" + effect + "/Duration", +(statusTemplate.Duration || 0), entity),
			"Interval": ApplyValueModificationsToEntity(valueModifRoot + "/ApplyStatus/" + effect + "/Interval", +(statusTemplate.Interval || 0), entity),
			"Stackability": statusTemplate.Stackability
		};
		Object.assign(result[effect], this.GetAttackEffectsData(valueModifRoot + "/ApplyStatus" + effect, statusTemplate, entity));
		if (statusTemplate.Modifiers)
			result[effect].Modifiers = this.GetStatusEffectsModifications(valueModifRoot, statusTemplate.Modifiers, entity, effect);
	}
	return result;
};

AttackHelper.prototype.GetStatusEffectsModifications = function(valueModifRoot, template, entity, effect)
{
	let modifiers = {};
	for (let modifier in template)
	{
		let modifierTemplate = template[modifier];
		modifiers[modifier] = {
			"Paths": modifierTemplate.Paths,
			"Affects": modifierTemplate.Affects
		};
		if (modifierTemplate.Add !== undefined)
			modifiers[modifier].Add = ApplyValueModificationsToEntity(valueModifRoot + "/ApplyStatus/" + effect + "/Modifiers/" + modifier + "/Add", +modifierTemplate.Add, entity);
		if (modifierTemplate.Multiply !== undefined)
			modifiers[modifier].Multiply = ApplyValueModificationsToEntity(valueModifRoot + "/ApplyStatus/" + effect + "/Modifiers/" + modifier + "/Multiply", +modifierTemplate.Multiply, entity);
		if (modifierTemplate.Replace !== undefined)
			modifiers[modifier].Replace = modifierTemplate.Replace;
	}
	return modifiers;
};

/**
 * Calculate the total effect taking bonus and resistance into account.
 *
 * @param {number} target - The target of the attack.
 * @param {Object} effectData - The effects calculate the effect for.
 * @param {string} effectType - The type of effect to apply (e.g. Damage, Capture or ApplyStatus).
 * @param {number} bonusMultiplier - The factor to multiply the total effect with.
 * @param {Object} cmpResistance - Optionally the resistance component of the target.
 *
 * @return {number} - The total value of the effect.
 */
AttackHelper.prototype.GetTotalAttackEffects = function(target, effectData, effectType, bonusMultiplier, cmpResistance)
{
	let total = 0;
	if (!cmpResistance)
		cmpResistance = Engine.QueryInterface(target, IID_Resistance);

	let resistanceStrengths = cmpResistance ? cmpResistance.GetEffectiveResistanceAgainst(effectType) : {};

	if (effectType == "Damage"){
        for (let type in effectData.Damage)
        { // HC-code, Damage is decreased per point of armour in that category
            let resistanceValue = resistanceStrengths.Damage[type]
            if (resistanceValue == null){ // HC-Code: Added a check for missing damage types to warn the programmer
				error("Entity: " + target + " misses resistance of type " + type + ". Damage calculation skips that damage type. This might result in attacks dealing no damage.");
            }
            if (resistanceValue > 98) // HC-code, prevent healing and full immunity to a resistance value
                resistanceValue = 98;

            total += effectData.Damage[type] - (effectData.Damage[type] * (resistanceValue * 0.01));
		}
    }
	else if (effectType == "Capture")
	{
		total = effectData.Capture * Math.pow(0.9, resistanceStrengths.Capture || 0);

		// If Health is lower we are more susceptible to capture attacks.
		let cmpHealth = Engine.QueryInterface(target, IID_Health);
		if (cmpHealth)
			total /= 0.1 + 0.9 * cmpHealth.GetHitpoints() / cmpHealth.GetMaxHitpoints();
	}
	if (effectType != "ApplyStatus")
		return total * bonusMultiplier;

	if (!resistanceStrengths.ApplyStatus)
		return effectData[effectType];

	let result = {};
	for (let statusEffect in effectData[effectType])
	{
		if (!resistanceStrengths.ApplyStatus[statusEffect])
		{
			result[statusEffect] = effectData[effectType][statusEffect];
			continue;
		}

		if (randBool(resistanceStrengths.ApplyStatus[statusEffect].blockChance))
			continue;

		result[statusEffect] = effectData[effectType][statusEffect];

		if (effectData[effectType][statusEffect].Duration)
			result[statusEffect].Duration = effectData[effectType][statusEffect].Duration *
				resistanceStrengths.ApplyStatus[statusEffect].duration;
	}
	return result;

};

/**
 * Get the list of players affected by the damage.
 * @param {number}  attackerOwner - The player id of the attacker.
 * @param {boolean} friendlyFire - A flag indicating if allied entities are also damaged.
 * @return {number[]} The ids of players need to be damaged.
 */
AttackHelper.prototype.GetPlayersToDamage = function(attackerOwner, friendlyFire)
{
	if (!friendlyFire)
		return QueryPlayerIDInterface(attackerOwner).GetEnemies();

	return Engine.QueryInterface(SYSTEM_ENTITY, IID_PlayerManager).GetAllPlayers();
};

/**
 * Damages units around a given origin.
 * @param {Object}   data - The data sent by the caller.
 * @param {string}   data.type - The type of damage.
 * @param {Object}   data.attackData - The attack data.
 * @param {number}   data.attacker - The entity id of the attacker.
 * @param {number}   data.attackerOwner - The player id of the attacker.
 * @param {Vector2D} data.origin - The origin of the projectile hit.
 * @param {number}   data.radius - The radius of the splash damage.
 * @param {string}   data.shape - The shape of the radius.
 * @param {Vector3D} [data.direction] - The unit vector defining the direction. Needed for linear splash damage.
 * @param {boolean}  data.friendlyFire - A flag indicating if allied entities also ought to be damaged.
 */
AttackHelper.prototype.CauseDamageOverArea = function(data)
{
	let nearEnts = PositionHelper.EntitiesNearPoint(data.origin, data.radius,
		this.GetPlayersToDamage(data.attackerOwner, data.friendlyFire));
	let damageMultiplier = 1;

	let cmpObstructionManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_ObstructionManager);

	// Cycle through all the nearby entities and damage it appropriately based on its distance from the origin.
	for (let ent of nearEnts)
	{
		// Correct somewhat for the entity's obstruction radius.
		// TODO: linear falloff should arguably use something cleverer.
		let distance = cmpObstructionManager.DistanceToPoint(ent, data.origin.x, data.origin.y);

		if (data.shape == 'Circular') // circular effect with quadratic falloff in every direction
			damageMultiplier = 1 - distance * distance / (data.radius * data.radius);
		else if (data.shape == 'Linear') // linear effect with quadratic falloff in two directions (only used for certain missiles)
		{
			// The entity has a position here since it was returned by the range manager.
			let entityPosition = Engine.QueryInterface(ent, IID_Position).GetPosition2D();
			let relativePos = entityPosition.sub(data.origin).normalize().mult(distance);

			// Get the position relative to the missile direction.
			let direction = Vector2D.from3D(data.direction);
			let parallelPos = relativePos.dot(direction);
			let perpPos = relativePos.cross(direction);

			// The width of linear splash is one fifth of the normal splash radius.
			let width = data.radius / 5;

			// Check that the unit is within the distance splash width of the line starting at the missile's
			// landing point which extends in the direction of the missile for length splash radius.
			if (parallelPos >= 0 && Math.abs(perpPos) < width) // If in radius, quadratic falloff in both directions
				damageMultiplier = (1 - parallelPos * parallelPos / (data.radius * data.radius)) *
					(1 - perpPos * perpPos / (width * width));
			else
				damageMultiplier = 0;
		}
		else // In case someone calls this function with an invalid shape.
		{
			warn("The " + data.shape + " splash damage shape is not implemented!");
		}
		// The RangeManager can return units that are too far away (due to approximations there)
		// so the multiplier can end up below 0.
		damageMultiplier = Math.max(0, damageMultiplier);

		data.type += ".Splash";
		this.HandleAttackEffects(ent, data, damageMultiplier);
	}
};

AttackHelper.prototype.ApplyKnockback = function (data, cmpArmour)
{	
    if (cmpArmour.IsInvulnerable() == true) // invulnerable entities cant be knocked back or stunned
        return false;
	
    if (cmpArmour.knockbackTimer != undefined) // check if the attacker has knockback and the target isnt already being knocked back
        return false;

    let resistanceModifier = (+100 - cmpArmour.GetKnockbackResistance()) * 0.01; // convert the knockback resistance to a percentage modifier (0 resistance = 1, 20 resistance = 0.8, 100 resistance = 0)
    if (resistanceModifier == 0) // if the resistance is 100% there is no point in trying to knock the unit, so return 
        return false;

    let target = data.target;
    let cmpIdentity = Engine.QueryInterface(target, IID_Identity);
    if (!cmpIdentity || !cmpIdentity.HasClass("Unit")) // only apply knockback to units (probably temp check for potential structures being knockable later in the mod stage)
        return false;

    let horizontalStrength = +data.Knockback.horizontal * resistanceModifier; // cache horizontal strength multiplied by the resistance modifier
    let direction = new Vector2D(0, 0); // new direction for melee or splash origin attacks

    let cmpTargetPosition = Engine.QueryInterface(target, IID_Position);
    let targetPos = cmpTargetPosition.GetPosition2D(); // get the current position of the target

    if (!data.isSplash)
    {
        if (data.type.startsWith("M")) // if its a melee attack get the direction vector from the attacker to the target
        {
            let cmpAttackerPos = Engine.QueryInterface(data.attacker, IID_Position);
            if (cmpAttackerPos) {
                let attackerPos = cmpAttackerPos.GetPosition2D();
                direction = Vector2D.sub(targetPos, attackerPos).normalize();
            }
        }
        else
            direction = Vector2D.from3D(data.direction).normalize(); // if its ranged use the predefined value as the direction
    }
    else // set the direction to the predefined direction or the new direction vector from the origin of the splash to the targets
        direction = Vector2D.from3D(data.direction).normalize() || Vector2D.sub(targetPos, data.origin).normalize(); 

    let newPos = Vector2D.add(targetPos, Vector2D.mult(direction, horizontalStrength)); // get the new position of the target by scaling the normalized direction vector with the strength of the knockback

    let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
    let repeatTime = 200;
    let verticalStrength = data.Knockback.vertical; 
    let verticalData = null;
    let runTime = 0;
    let iterationCount = 0; // the number of iterations required to get to the new position

    if (verticalStrength)
    {
        verticalData = {};
        //We need to know the height of the ground plane first to calculate the height difference between the ground and the building above
        let pos = cmpTargetPosition.GetPosition();
        let cmpTerrain = Engine.QueryInterface(SYSTEM_ENTITY, IID_Terrain);
        let cmpWaterManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_WaterManager);
        let ground = Math.max(cmpTerrain.GetGroundLevel(pos.x, pos.z), cmpWaterManager.GetWaterLevel(pos.x, pos.z));
        let simulateY = cmpTargetPosition.GetPosition().y - ground; // we need the start height, which isnt guaranteed to be 0 all the time, mainly for turreted units

        let repeatModifier = (repeatTime / 1000); // the modifier to calculate from seconds to miliseconds
        let gravity = -19.62 * repeatModifier; // twice the earths gravity value multiplied with the modifier
        verticalData.scaledGravity = gravity;
        let strength = +verticalStrength * resistanceModifier; // cache the vertical strength multiplied by the resistance modifier
        verticalData.strength = strength;
        while (true) // simulate how many iterations the knockback will require until it hits the ground again
        {
            runTime += repeatTime;
            iterationCount += 1;
            simulateY += ((iterationCount * gravity) + strength) * repeatModifier;
            if (simulateY <= 0)
                break;
        }

        verticalData.finalIteration = iterationCount;
        verticalData.repeatModifier = repeatModifier;
    }
    else // set the number of iterations and runtime to a ceiling of 2.5 seconds if the knockback is solely horizontal
    {
        runTime = (horizontalStrength * 0.05) * 1000; // 1 second per 20 cells
        if (runTime > 2500)
            runTime = 2500; // set a max threshold for the runtime to reduce hovering effect for large strength values
        iterationCount = runTime / repeatTime;
    }

    let initialDelay = 0;   
    let deltaSpeedScale = +1.9 / iterationCount; // the deltaX and deltaZ should be higher at the start (190% of deltaX,Z) and slower near the end (10% of deltaX,Z)
    let deltaX = (newPos.x - targetPos.x) / iterationCount; // the amount of x that needs to be changed per iteration
    let deltaZ = (newPos.y - targetPos.y) / iterationCount; // the amount of z that needs to be changed per iteration
    let attacker = data.attacker;

    cmpTimer.SetTimeout(target, IID_Resistance, "InitKnockback", 200, { "runtime": runTime });
    let knockbackData = { "iterationCount": iterationCount, "deltaX": deltaX, "deltaZ": deltaZ, "deltaSpeedScale": deltaSpeedScale, "startPos": targetPos, "verticalData": verticalData };
    cmpArmour.knockbackTimer = cmpTimer.SetInterval(target, IID_Resistance, "InterpolateKnockback", initialDelay, repeatTime, knockbackData); // Call knockback function every repeatTime miliseconds until the targeted entity has reached its knockback destination
    cmpArmour.registerData.attacker = attacker;
    cmpArmour.registerData.attackerOwner = data.attackerOwner;
    return true;
};

/**
 * Apply a Manual Knockback from the code, rather than from a performed attack
 * @param {any} ent
 * @param {any} horizontal
 * @param {any} vertical
 */
AttackHelper.prototype.ApplyKnockbackManual = function (ent, horizontalStrength, verticalStrength = 0)
{
    let CmpResistance = Engine.QueryInterface(ent, IID_Resistance);
    if (CmpResistance.IsInvulnerable() == true) // remove invulnerability if necessary
        CmpResistance.SetInvulnerability(false);

    if (CmpResistance.knockbackTimer != undefined) // check if the attacker has knockback and the target isnt already being knocked back
        return false;

    let resistanceModifier = (+100 - CmpResistance.GetKnockbackResistance()) * 0.01; // convert the knockback resistance to a percentage modifier (0 resistance = 1, 20 resistance = 0.8, 100 resistance = 0)
    if (resistanceModifier == 0) // if the resistance is 100% there is no point in trying to knock the unit, so return 
        return false;

    let cmpIdentity = Engine.QueryInterface(ent, IID_Identity);
    if (!cmpIdentity || !cmpIdentity.HasClass("Unit")) // only apply knockback to units (probably temp check for potential structures being knockable later in the mod stage)
        return false;

    horizontalStrength *= resistanceModifier; // horizontal strength multiplied by the resistance modifier

    let randX = (randFloat(0, 1) * 100);
    let randZ = (randFloat(0, 1) * 100);
    let direction = new Vector2D(randX, randZ).normalize(); // use 2 random values for the direction, normalized

    let cmpTargetPosition = Engine.QueryInterface(ent, IID_Position);
    let targetPos = cmpTargetPosition.GetPosition2D(); // get the current position of the target
    let newPos = Vector2D.add(targetPos, Vector2D.mult(direction, horizontalStrength)); // get the new position of the target by scaling the normalized direction vector with the strength of the knockback

    let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
    let repeatTime = 200;
    let verticalData = null;
    let runTime = 0;
    let iterationCount = 0; // the number of iterations required to get to the new position

    if (verticalStrength > 0)
    {
        verticalData = {};
        //We need to know the height of the ground plane first to calculate the height difference between the ground and the building above
        let pos = cmpTargetPosition.GetPosition();
        let cmpTerrain = Engine.QueryInterface(SYSTEM_ENTITY, IID_Terrain);
        let cmpWaterManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_WaterManager);
        let ground = Math.max(cmpTerrain.GetGroundLevel(pos.x, pos.z), cmpWaterManager.GetWaterLevel(pos.x, pos.z));
        let simulateY = cmpTargetPosition.GetPosition().y - ground; // we need the start height, which isnt guaranteed to be 0 all the time, mainly for turreted units

        let repeatModifier = (repeatTime / 1000); // the modifier to calculate from seconds to miliseconds
        let gravity = -19.62 * repeatModifier; // twice the earths gravity value multiplied with the modifier
        verticalData.scaledGravity = gravity;
        let strength = verticalStrength * resistanceModifier; // cache the vertical strength multiplied by the resistance modifier
        verticalData.strength = strength;
        while (true) // simulate how many iterations the knockback will require until it hits the ground again
        {
            runTime += repeatTime;
            iterationCount += 1;
            simulateY += ((iterationCount * gravity) + strength) * repeatModifier;
            if (simulateY <= 0)
                break;
        }

        verticalData.finalIteration = iterationCount;
        verticalData.repeatModifier = repeatModifier;
    }
    else // set the number of iterations and runtime to a ceiling of 2.5 seconds if the knockback is solely horizontal
    {
        runTime = (horizontalStrength * 0.05) * 1000; // 1 second per 20 cells
        if (runTime > 2500)
            runTime = 2500; // set a max threshold for the runtime to reduce hovering effect for large strength values
        iterationCount = runTime / repeatTime;
    }

    let initialDelay = 0;
    let deltaSpeedScale = +1.9 / iterationCount; // the deltaX and deltaZ should be higher at the start (190% of deltaX,Z) and slower near the end (10% of deltaX,Z)
    let deltaX = (newPos.x - targetPos.x) / iterationCount; // the amount of x that needs to be changed per iteration
    let deltaZ = (newPos.y - targetPos.y) / iterationCount; // the amount of z that needs to be changed per iteration

    cmpTimer.SetTimeout(ent, IID_Resistance, "InitKnockback", 0, { "runtime": runTime });
    let knockbackData = { "iterationCount": iterationCount, "deltaX": deltaX, "deltaZ": deltaZ, "deltaSpeedScale": deltaSpeedScale, "startPos": targetPos, "verticalData": verticalData };
    CmpResistance.knockbackTimer = cmpTimer.SetInterval(ent, IID_Resistance, "InterpolateKnockback", initialDelay, repeatTime, knockbackData); // Call knockback function every repeatTime miliseconds until the targeted entity has reached its knockback destination
    return true;
};

/**
 * Handle an attack peformed on an entity.
 *
 * @param {number} target - The targetted entityID.
 * @param {Object} data - The data of the attack.
 * @param {string} data.type - The type of attack that was performed (e.g. "Melee" or "Capture").
 * @param {Object} data.effectData - The effects use.
 * @param {number} data.attacker - The entityID that attacked us.
 * @param {number} data.attackerOwner - The playerID that owned the attacker when the attack was performed.
 * @param {number} bonusMultiplier - The factor to multiply the total effect with, defaults to 1.
 *
 * @return {boolean} - Whether we handled the attack.
 */
AttackHelper.prototype.HandleAttackEffects = function(target, data, bonusMultiplier = 1)
{
	let cmpResistance = Engine.QueryInterface(target, IID_Resistance);
	if (cmpResistance == undefined)
        return false;

    if (cmpResistance.IsInvulnerable())
        return false;
	
    // HC-Code
    // check whether this unit has dodged the "Melee" attack
    if (cmpResistance.HasDodged(data.type) == true)
        return false;

    // HC-Code
    // Spawn on hit code
    //Each time a projectile hits an enemy we need to calculate the chance to spawn a unit if there is a spawn on hit value
    let entityImpact = data.EntityOnImpact;
    if (entityImpact)
    {
        if (entityImpact.spawnOnHit) // check if this attacker is allowed to spawn on hit
        {
            let cmpResistance = Engine.QueryInterface(data.target, IID_Resistance);
            if (!cmpResistance)
                return;

            // spawn the new entity(ies) at the location of the target by default, unless the attacker location is specified
            let pos = { "x": data.position.x, "y": data.position.z };
            if (entityImpact.spawnOnHit.spawnAtTarget == false)
                pos = Engine.QueryInterface(data.attacker, IID_Position).GetPosition2D();

            cmpResistance.SpawnImpactUnits(entityImpact, pos, entityImpact.spawnOnHit.chance, data.attackerOwner);
        }
    }
    // HC-End

    //HC-Code
    data.target = target;
    if (data.Knockback != null && cmpResistance != undefined)
	    this.ApplyKnockback(data, cmpResistance);

	//HC-Code
	let Stun = data.Stun;
    if (Stun && cmpResistance.knockbackTimer == undefined) // dont stun if there is a knockback in effect for this entity
    {
        // Check resistanceModifier for regular stuns only, not for knockback stuns
        let resistanceModifier = (+100 - cmpResistance.GetStunResistance()) * 0.01; // percentage modifier for stunning, (0 resistance = 1, 20 resistance = 0.8, 100 resistance = 0)
        if (resistanceModifier > 0) // proceed with the stun procedure if stun resistance is below 100
        {
            let miliseconds = resistanceModifier * Stun.time; // reduce the stun time with the stun resistance percentage      
            let rand = (randFloat(0, 1) * 100);
            if (rand <= Stun.chance) // stun the target based on the stun chance 
                cmpResistance.StunEntity(target, miliseconds);
        }
    }
	//HC-End

	bonusMultiplier *= !data.attackData.Bonuses ? 1 : this.GetAttackBonus(data.attacker, target, data.type, data.attackData.Bonuses);

	let targetState = {};
	for (let receiver of g_AttackEffects.Receivers())
	{
		if (!data.attackData[receiver.type])
			continue;

		let cmpReceiver = Engine.QueryInterface(target, global[receiver.IID]);
		if (!cmpReceiver)
			continue;

		Object.assign(targetState, cmpReceiver[receiver.method](this.GetTotalAttackEffects(target, data.attackData, receiver.type, bonusMultiplier, cmpResistance), data.attacker, data.attackerOwner));
	}

	if (!Object.keys(targetState).length)
		return false;

	Engine.PostMessage(target, MT_Attacked, {
		"type": data.type,
		"target": target,
		"attacker": data.attacker,
		"attackerOwner": data.attackerOwner,
		"damage": -(targetState.healthChange || 0),
		"capture": targetState.captureChange || 0,
		"statusEffects": targetState.inflictedStatuses || [],
		"fromStatusEffect": !!data.attackData.StatusEffect,
	});

	// We do not want an entity to get XP from active Status Effects.
	if (!!data.attackData.StatusEffect)
		return true;

	let cmpPromotion = Engine.QueryInterface(data.attacker, IID_Promotion);
	if (cmpPromotion && targetState.xp)
		cmpPromotion.IncreaseXp(targetState.xp);

	return true;
};

/**
 * Calculates the attack damage multiplier against a target.
 * @param {number} source - The source entity's id.
 * @param {number} target - The target entity's id.
 * @param {string} type - The type of attack.
 * @param {Object} template - The bonus' template.
 * @return {number} - The source entity's attack bonus against the specified target.
 */
AttackHelper.prototype.GetAttackBonus = function(source, target, type, template)
{
	let cmpIdentity = Engine.QueryInterface(target, IID_Identity);
	if (!cmpIdentity)
		return 1;

	let attackBonus = 1;
	let targetClasses = cmpIdentity.GetClassesList();
	let targetCiv = cmpIdentity.GetCiv();

	// Multiply the bonuses for all matching classes.
	for (let key in template)
	{
		let bonus = template[key];
		if (bonus.Civ && bonus.Civ !== targetCiv)
			continue;
		if (!bonus.Classes || MatchesClassList(targetClasses, bonus.Classes))
			attackBonus *= ApplyValueModificationsToEntity("Attack/" + type + "/Bonuses/" + key + "/Multiplier", +bonus.Multiplier, source);
	}

	return attackBonus;
};

Engine.RegisterGlobal("AttackHelper", new AttackHelper());
Engine.RegisterGlobal("g_AttackEffects", new AttackEffects());
