{
    var cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
    var cmpTrigger = Engine.QueryInterface(SYSTEM_ENTITY, IID_Trigger);
    var cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
}

Trigger.prototype.VictoryPlayer = function ()
{
    let cmpPlayer = QueryPlayerIDInterface(1, IID_Player);
    this.PlayMusic({ tracks: ["campaign_victory.ogg"] })
    cmpPlayer.SetState("won", "You have succesfully completed the mission.");
    // this.CampaignEndUI({ image: "gohma_victoryA" }); 
}

Trigger.prototype.DefeatPlayer = function ()
{
    let cmpPlayer = QueryPlayerIDInterface(1, IID_Player);
    this.PlayMusic({ tracks: ["campaign_lose.ogg"] })
    cmpPlayer.SetState("defeated", "You have lost the mission");
    // this.CampaignEndUI({ image: "gohma_defeatA" });
}

Trigger.prototype.PlayMusic = function (data)
{
    if (this.musicTimer != 0) // if a music reset is still pending, cancel that reset before initiating a new music track
    {
        cmpTimer.CancelTimer(this.musicTimer);
        this.musicTimer = 0;
    }

    cmpGUIInterface.PushNotification({
        "type": "play-custom-track",
        "players": [1],
        "tracks": data.tracks,
    });

    if (data.resetDelay && data.resetDelay > 0) // music plays in real time only and is not influenced by game speed, while the ingame delays are, so have to base this timer on Date.now() instead
        this.musicTimer = cmpTrigger.DoAfterDelay(1000, "ResetMusic", {"threshold": Date.now() + data.resetDelay });
}

Trigger.prototype.ResetMusic = function (data)
{
    if (data.threshold) // check if music can be cancelled if there is a threshold time set for it
    {
        if (Date.now() < data.threshold)
        {
            cmpTrigger.DoAfterDelay(1000, "ResetMusic", { "threshold": data.threshold }); // recall this function until the threshold has been reached to reset the music
            return; // also make sure to return before we loop the unlock function constantly
        }
    }

    cmpGUIInterface.PushNotification({
        "type": "unlockMusic",
        "players": [1]
    });

    this.musicTimer = 0; // reset music timer to 0 since we just reset the music
}

Trigger.prototype.CampaignEndUI = function (data) // push dialogue with sound and imagery to the window
{
    cmpGUIInterface.PushNotification({
        "type": "campaignEnd",
        "players": [1],
        "image": data.image
    });
};

Trigger.prototype.SquareVectorDistance = function (a, b)
{
    return Math.euclidDistance2DSquared(a[0], a[1], b[0], b[1]);
}

/**
 * Units flee to a location given object data
 */
Trigger.prototype.SetUnitFlee = function (data)
{
    this.SetAIStance("none", data.entities, data.playerID); // set stance to none so they wont react to AI states any longer
    this.WalkCommand(data.x, data.z, data.entities, data.playerID, data.queue); // walk to location
    for (let entity of data.entities)
    {
        let cmpUnitAI = Engine.QueryInterface(entity, IID_UnitAI);
        if (!cmpUnitAI)
            return;

        cmpUnitAI.SelectAnimation("move"); // set animation
        cmpUnitAI.SetMoveSpeed(cmpUnitAI.GetRunSpeed()); // set to run speed so they start the run animation instead of walking
    }
}

/**
 * 
 * @param {list, x, y, threshold} data
 */
Trigger.prototype.RemoveAtFleeLocation = function (data)
{
    let indices = []; // indices that have to be removed from the list
    let list = data.list;
    for (let i = 0; i < list.length; i++)
    {
        let cmpPos = Engine.QueryInterface(list[i], IID_Position);
        if (!cmpPos || !cmpPos.IsInWorld())
        {
            indices.push(i); // no pos must mean its invalid, add to removal list
            continue;
        }

        let Pos2D = cmpPos.GetPosition2D();
        let dist = this.SquareVectorDistance([Pos2D.x, Pos2D.y], [data.x, data.z]); // squared dist between given removal pos and the entities position
        if (dist < data.threshold * data.threshold) // check dist with threshold provided
        {
            indices.push(i); // entity is close enough, so add to removal list
            Engine.DestroyEntity(list[i]); // destroy entity
        }
    }

    let updatedList = this.RemoveIndices(indices, list);
    if (updatedList.length > 0)
        cmpTrigger.DoAfterDelay(500, "RemoveAtFleeLocation", { list: updatedList, x: data.x, z: data.z, threshold: data.threshold }); // recall removal check until the list is empty
}

Trigger.prototype.UpdateList = function (list)
{
    let removedIndices = [];
    for (let i = 0; i < list.length; i++) {
        let ent = list[i];
        if (Engine.QueryInterface(ent, IID_Health) == undefined) // could make this based on SetRemove parameter inside the unit arrays later
            removedIndices.push(i);
    }
    this.RemoveIndices(removedIndices, list);
}

// update a given list by deleting removed game elements from it
Trigger.prototype.RemoveIndices = function (removedIndices, originList)
{
    // while splicing, an element is taken from a list, and every element above it is dropped down by 1 index position
    // this removal system works because the index list provided is always organized from the lowest to the highest index
    // if you take away for example index 8 first, and index 4 afterward, index 4 will be decreased by count and become index 3 instead of 4
    // This is a problem because index 4 actually hasnt been decreased by the removal of index 8, because it only dropped down all elements above index 8 and not below

    let count = 0;
    for (let index of removedIndices)
    {
        let newIndex = +index - +count; // for every element deleted, the indices all go down by 1, so cancel that by adding 1 back for every iteration
        originList.splice(newIndex, 1); // splice element
        count += 1; // keep track of the iteration count for valid splicing
    }
    return originList;
}

// spawns (and potentially destroys) a vision object for a player at a specific location
Trigger.prototype.SpawnVision = function (data)
{
    let ent = Engine.AddEntity("other/map_revealer_" + data.size); // small, medium or large
    let cmpEntPosition = Engine.QueryInterface(ent, IID_Position);
    if (!cmpEntPosition) {
        Engine.DestroyEntity(ent);
        return;
    }

    let cmpEntOwnership = Engine.QueryInterface(ent, IID_Ownership);
    if (cmpEntOwnership)
        cmpEntOwnership.SetOwner(data.owner);

    cmpEntPosition.JumpTo(data.x, data.z);

    if (data.resetDelay > 0)
        cmpTrigger.DoAfterDelay(data.resetDelay, "DestroyEnt", ent);

    return ent;
}

Trigger.prototype.SpawnBuilding = function (data)
{
    let ent = 0;
    if(data.asFoundation == true)
        ent = Engine.AddEntity("foundation|" + data.template); 
    else
        ent = Engine.AddEntity(data.template); 

    let cmpEntPosition = Engine.QueryInterface(ent, IID_Position);
    if (!cmpEntPosition) {
        Engine.DestroyEntity(ent);
        return;
    }

    let cmpEntOwnership = Engine.QueryInterface(ent, IID_Ownership);
    if (cmpEntOwnership)
        cmpEntOwnership.SetOwner(data.owner);

    cmpEntPosition.JumpTo(data.x, data.z);
    cmpEntPosition.SetYRotation(data.angle);

    if (data.asFoundation == true) {
        let cmpFoundation = Engine.QueryInterface(ent, IID_Foundation);
        cmpFoundation.InitialiseConstruction(data.owner, data.template);
    }

    return ent;
}

Trigger.prototype.InitGarrison = function (ent) {
    const cmpHealth = Engine.QueryInterface(ent, IID_Health);
    if(cmpHealth != undefined && cmpHealth.template.SpawnGarrison) cmpHealth.SpawnGarrisonUnits();
}

Trigger.prototype.GetEntsInsideSquare = function (list, minX, maxX, minZ, maxZ)
{
    let newList = [];
    for (let ent of list)
    {
        let pos = Engine.QueryInterface(ent, IID_Position).GetPosition2D();
        if (pos.x > minX && pos.x < maxX && pos.y > minZ && pos.y < maxZ)
            newList.push(ent);
    }
    return newList;
}

Trigger.prototype.SpawnUnit = function (data) {
    let ent = Engine.AddEntity(data.template);
    let cmpEntPosition = Engine.QueryInterface(ent, IID_Position);
    if (!cmpEntPosition) {
        Engine.DestroyEntity(ent);
        return;
    }

    let cmpEntOwnership = Engine.QueryInterface(ent, IID_Ownership);
    if (cmpEntOwnership)
        cmpEntOwnership.SetOwner(data.owner);

    cmpEntPosition.JumpTo(data.x, data.z);
    cmpEntPosition.SetYRotation(data.angle);

    return ent;
}

Trigger.prototype.PlayUnitSound = function (data)
{
    let cmpUnitAI = Engine.QueryInterface(data.entity, IID_UnitAI);
    if (!cmpUnitAI)
        return;

    cmpUnitAI.PlaySound(data.name);
}

Trigger.prototype.DestroyEnt = function (ent)
{
    Engine.DestroyEntity(ent);
}

Trigger.prototype.SetInvulnerability = function (ent, state)
{
    let cmpArmour = Engine.QueryInterface(ent, IID_DamageReceiver);
    if (!cmpArmour)
        return;
    cmpArmour.SetInvulnerability(state);
}

Trigger.prototype.ResetSpeedMultiplier = function(ent)
{
	let cmpUnitMotion = Engine.QueryInterface(ent, IID_UnitMotion);
	if (cmpUnitMotion)
		cmpUnitMotion.SetSpeedMultiplier(1);
};

Trigger.prototype.SetSpeedMultiplier = function(ent, speed)
{
	let cmpUnitMotion = Engine.QueryInterface(ent, IID_UnitMotion);
	if (cmpUnitMotion)
		cmpUnitMotion.SetSpeedMultiplier(speed);
};

Trigger.prototype.RemoveEntitiesByClass = function(entities, classes)
{
    return entities.filter(ent => !TriggerHelper.EntityMatchesClassList(ent, classes))
};

Trigger.prototype.WalkCommand = function (x, z, entities, playerID, queue, type = "walk")
{
    let cmd = {};
    cmd.type = type;
    cmd.x = x;
    cmd.z = z;
    cmd.entities = entities;
    cmd.queued = queue;
    ProcessCommand(playerID, cmd);
}

Trigger.prototype.AttackCommand = function (x, z, entities, playerID, queue, type = "attack-walk")
{
    let cmd = {};
    cmd.type = type;
    cmd.x = x;
    cmd.z = z;
    cmd.entities = entities;
    cmd.targetClasses = { "attack": ["Unit", "Structure"] };
    cmd.allowCapture = false;
    cmd.queued = queue;
    ProcessCommand(playerID, cmd);
}

Trigger.prototype.SetAIStance = function (name, entities, playerID, type = "stance")
{
    let cmd = {};
    cmd.type = type;
    cmd.entities = entities;
    cmd.name = name;
    ProcessCommand(playerID, cmd);
}

Trigger.prototype.ConstructCommand = function (x, z, angle, template, playerID, type = "construct") {

    let cmd = {};
    cmd.type = type;
    cmd.entities = [this.Agitha];
    cmd.template = template;
    cmd.x = x;
    cmd.z = z;
    cmd.angle = angle;
    cmd.autorepair = angle;
    cmd.autocontinue = angle;
    cmd.queued = angle;
    ProcessCommand(playerID, cmd);
}

Trigger.prototype.DialogueWindow = function (data) // push dialogue with sound and imagery to the window
{
    const runtime = data.runtime != undefined ? data.runtime : 10000;
    cmpGUIInterface.PushNotification({
        "type": "AIDialog",
        "players": [1],
        "targetPlayers": [1],
        "sender": [1],
        "character": data.character,
        "dialogue": data.dialogue,
        "soundIndex": data.soundIndex, // represents the index of the played character sound ( -1 = no sound, 0 = random sound of the total, 1-x = specific sound with that index)
        "portraitSuffix": data.portraitSuffix, // _annoyed, _angry, _defeated, _neutral, _sad, _victorious, _happy
        "runtime": runtime,
        "clear": data.clear != undefined ? true : false
    });
};

Trigger.prototype.CloseDialogueWindow = function ()
{
    cmpGUIInterface.PushNotification({
        "type": "AIDialog",
        "players": [1],
        "targetPlayers": [1],
        "sender": [1],
        "hide": true,
    });
}

Trigger.prototype.SendGenericRequest = function (data)
{
    cmpGUIInterface.PushNotification({
        "type": "genericCampaign",
        "players": [1],
        "dialogue": data.dialogue, // the message being sent
        "functionTrue": data.functionTrue, // which function to call when yes was pressed
        "functionFalse": data.functionFalse, // which function to call when no was pressed
        "delay": data.delay
    });
}

Trigger.prototype.RevealMap = function (data)
{
    let cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    cmpRangeManager.SetLosRevealAll(-1, data.state);
}

Trigger.prototype.StopCinematicCamera = function ()
{
    cmpCinemaManager.Stop();
}