function Plots() {}

Plots.prototype.Schema =
	"<a:help>Used to spawn one or more plots attached to buildings. </a:help>" +
	"<a:example>" +
		"<Max>100</Max>" +
		"<RegenRate>1.0</RegenRate>" +
		"<IdleRegenRate>0</IdleRegenRate>" +
		"<DeathType>corpse</DeathType>" +
	"</a:example>" +
    "<optional>"  +
        "<element name='IsPlot' a:help='Set this to true when the unit itself is a plot'><data type='boolean'/></element>" +
    "</optional>"  +
    "<optional>"  +
        "<element name='CanSpawnFromPlot' a:help='Set this to true when a building or unit shall be able to spawn from a plot'><data type='boolean'/></element>" +
    "</optional>"  +
    "<optional>"  +
        "<element name='CanTakeOverPlots' a:help='Set this to true when a building or unit shall be able take over plots. For example when a unit with plots can upgrade to that building'><data type='boolean'/></element>" +
    "</optional>"  +
    "<optional>"  +
        "<element name='CanUpgradeToPlots' a:help='Set this to true when a building or unit can upgrade into an unit that has plots like the labrynna storehouse'><data type='boolean'/></element>" +
    "</optional>"  +
    "<optional>"  +
        "<element name='CheckTemplateBeforeCreation' a:help='Before a plot is placed this variable will check if the place ia a valid place to place the given template'><text/></element>" +
    "</optional>"  +
    "<optional>"  +
        "<element name='DisableChainedPlotsUponDestruction' a:help='Removes not upgraded plots from attached upgraded plots that spawn plots by themself. Needs LinkedDestruction=False'><data type='boolean'/></element>" +
    "</optional>"  +
    "<optional>" +
        "<element name='PlotsToSpawn' a:help='Points that will be used to visibly garrison a unit'>" +
            "<zeroOrMore>"  +
                "<element a:help='Element containing the offset coordinates'>" +
                    "<anyName/>" +
                    "<interleave>" +
                        "<element name='Template'><text/></element>" +
                        "<element name='X'><data type='decimal'/></element>" +
                        "<element name='Z'><data type='decimal'/></element>" +
                        "<element name='LinkedDestruction' a:help='if this plot gets destroyed when the origin building gets destroyed'><data type='boolean'/></element>" +
                        "<optional>" +
                            "<element name='Angle' a:help='Angle in degrees relative to the origin direction'><data type='decimal'/></element>" +
                        "</optional>" +	
                        "<optional>"  +
                            "<element name='CheckTemplateBeforeCreation' a:help='Before a plot is placed this variable will check if the place ia a valid place to place the given template'><text/></element>" +
                        "</optional>"  +					    
                        "<optional>"  +
                            "<element name='UpgradeUponCreation' a:help='Upgrades a plot to the given template immediately after it was created'><text/></element>" +
                        "</optional>"  +					    
                        "<optional>"  +
                            "<element name='AllowRejoin' a:help='In a chain of plots, allow plots to rejoin if the chain is interrupted. Needs CheckTemplateBeforeCreation. Needed for aqueducts'><text/></element>" +
                        "</optional>"  +					    
                    "</interleave>" +
                "</element>" +
            "</zeroOrMore>" +
        "</element>" +
    "</optional>";

Plots.prototype.Init = function ()
{
    //variables for individual plots
    this.originID = null;
    this.plotTemplate = null;
    this.cachedPlotTemplate = null; // Remember the original plot template. Useful to check whether a plot is upgraded or not
    this.plotsHaveSpawned = false;
    this.plotOffset = null;
    
    this.isPlot = this.template.IsPlot;
    
    this.disableChainedPlotsUponDestruction = this.template.DisableChainedPlotsUponDestruction;
    this.active = true; // Needes for plot chaining and setting them inactive.
    this.rejoinedPlots = new Array(); // Holds a list of plots that needs to be rejoined to this core

    // define the base list that holds all the info regarding the plots from a core building (hub)
    this.allPlots = [];
    let plots = this.template.PlotsToSpawn;
    this.plotOwner = null; // set this to the initial owner of this hub when the plots are spawned
    
    if (plots){
        for (let plot in plots) {
            this.allPlots.push
            ({
                "template": plots[plot].Template,
                "offset":
                {
                    "x": +plots[plot].X,
                    "y": +0,
                    "z": +plots[plot].Z
                },
                "angle": plots[plot].Angle ? +plots[plot].Angle * Math.PI / 180 : 0,
                "linkedDestruction": plots[plot].LinkedDestruction != "false",
                "checkTemplate": plots[plot].CheckTemplateBeforeCreation,
                "upgradeUponCreation": plots[plot].UpgradeUponCreation,
                "allowRejoin": plots[plot].AllowRejoin,
                "id": null
            });
        }
    }
};

Plots.prototype.GetAssociatedPlots = function ()
{
    return this.allPlots;
}

// Needed for aqueduct mechanic.
// Brings back all not upgraded plots into World.
// If the plot is upgraded already and in world, call this function until the whole chain of plots is active again
Plots.prototype.SetChainActive = function (plotToReactivate)
{
    let cmpPlots = Engine.QueryInterface(plotToReactivate, IID_Plots);
    // If we set the plot to inactive at some point, it needs to be aet to active as soon as it is connected again
    if(cmpPlots.active == false){
       cmpPlots.active = true;
    }
    
    // // If there are any (not upgraded) plots moved out of the world, bring them back. Needed for aqueduct mechanic
    for (let plot of cmpPlots.allPlots){
        let cmpPosition = Engine.QueryInterface(plot.id, IID_Position);
        let pos = plot.oldPosition;
        let rot = plot.oldRot;
        
        // Bring back, if not in world
        if (!cmpPosition.IsInWorld()){
            if (!pos || !rot){
                continue;
            }
            
            cmpPosition.JumpTo(pos.x, pos.z);
            cmpPosition.SetYRotation(rot.y);
            cmpPosition.SetXZRotation(rot.x, rot.z);
        } else{
            // If it is in world, the plot must be upgraded. -> Set is active in recursion until all connected plots are active again
            let cmpUpgradedPlotInchain = Engine.QueryInterface(plot.id, IID_Plots);
            cmpUpgradedPlotInchain.SetChainActive(plot.id);
        }
    }
}

// Attaches plots that have no owner and are in a place where a plot would spawn to this core
Plots.prototype.RejoinPlotIfSpecified = function (plotPreview)
{
    let cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    let entityOnSpawnPosition = cmpRangeManager.ExecuteQuery(plotPreview, 0, 10, [1], IID_Plots);
    let entityToRejoin = entityOnSpawnPosition[0]; // There shall be only one entity. Might need some check here is things might break because of that assumption
    // If entities overlap
    if (entityToRejoin){
        let cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
        let templateEnt = cmpTemplateManager.GetCurrentTemplateName(entityToRejoin);
        
        let cmpPlots = Engine.QueryInterface(entityToRejoin, IID_Plots);
        
        // Attach plots that have no owner to this plot owner
        if (cmpPlots.originID == null){
            cmpPlots.originID = this.entity;
            cmpPlots.plotTemplate = cmpPlots.cachedPlotTemplate;
            
            // Needs to store this here. The list will be added to allPlots later. There is no way to recover the missing information. But we don't need it afterwards
            let cmpPosition = Engine.QueryInterface(entityToRejoin, IID_Position);
            this.rejoinedPlots.push
            ({
                "template": cmpPlots.plotTemplate,
                "linkedDestruction": false,
                "checkTemplate": true,
                "oldPosition": cmpPosition.GetPosition(),
                "oldRot": cmpPosition.GetRotation(),
                "id": entityToRejoin
            });
            
            // When the plot was set to inactive while disconnection, we need to set it to active again
            this.SetChainActive(entityToRejoin);
        }
    }
}

// This is used if a building spawns on a plot that itself has plots attached to it.
// Returns true or false
Plots.prototype.CheckIfPlotSpawnsOnAValidPlace = function (plot, rot)
{
    // Use preview Template for testing
    let plotPreview = Engine.AddEntity("preview|" + plot.checkTemplate);
    let plotPreviewLocationCmp = Engine.QueryInterface(plotPreview, IID_Position);
    plotPreviewLocationCmp.SetTurretParent(this.entity, plot.offset);
    plotPreviewLocationCmp.SetTurretParent(INVALID_ENTITY, new Vector3D());
    plotPreviewLocationCmp.SetYRotation(+plot.angle + rot.y);
    
    let cmpOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
    let cmpSpawnedOwnership = Engine.QueryInterface(plotPreview, IID_Ownership);
    if (cmpOwnership && cmpSpawnedOwnership)
        cmpSpawnedOwnership.SetOwner(cmpOwnership.GetOwner());
    
    // Check whether building placement is valid
    let cmpBuildRestrictions = Engine.QueryInterface(plotPreview, IID_BuildRestrictions);
    let plotAllowed = undefined;
    if (!cmpBuildRestrictions)
        error("cmpBuildRestrictions not defined");
    else
        plotAllowed = cmpBuildRestrictions.CheckPlacement();
    
    // If we would spawn on a plot, we need to attach it to this core, if it has no owner and may be re-arrached
    if (plot.allowRejoin){
        this.RejoinPlotIfSpecified(plotPreview);
    }
    
    Engine.DestroyEntity(plotPreview);
    
    if (plotAllowed.success == false){
        return false;
    } else {
        return true
    }
}

// Function that is called if a plot shall be upgraded upon creation
Plots.prototype.UpgradePlotUponCreationIfSpecified = function (plot)
{
    let templateToUpgradeTo = plot.upgradeUponCreation;
    if(!templateToUpgradeTo){
        return;
    }
    
    let cmpUpgrade = Engine.QueryInterface(plot.id, IID_Upgrade);
    cmpUpgrade.Upgrade(templateToUpgradeTo, false, true);
}

Plots.prototype.SpawnPlots = function (rot, owner)
{
    if (this.allPlots.length < 1) // no point in trying to spawn plots for non-plothubs
        return;
        
    // Used while checking plots for valid places. Only the spawned plots shall remain in the list of allPlots
    let spawnedPlots = new Array();
    
    this.plotOwner = Engine.QueryInterface(this.entity, IID_Ownership).GetOwner(); // preset the owner of this hub to reset plots back to this owner when captured and/or destroyed
    // loop over all plots that this building might hold(length of the plot list will mostly be 0 due to only a few buildings functioning as cores)
    for (let plot of this.allPlots)
    {
        let cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
        let ownPosition = cmpPosition.GetPosition();
        
        plot.rot = rot;
        
        // Code to execute if "CheckTemplateBeforeCreation" is set. 
        // a plot shall check if it spawns on a valid place
        // If "AllowRejoin" shall be true, this option must be set
        if (plot.checkTemplate){
            let placeIsValid = this.CheckIfPlotSpawnsOnAValidPlace(plot, rot);
            if (!placeIsValid){
                continue;
            }
        }
        spawnedPlots.push(plot); // Cache all plots that have spawned. If "CheckTemplateBeforeCreation" is set, not every plot in "allPlots" might spawn
        
        // spawn entity and query references to its variables
        let spawnedEntity = Engine.AddEntity(plot.template);
        let plotLocationCmp = Engine.QueryInterface(spawnedEntity, IID_Position);       
        let plotOwnershipCmp = Engine.QueryInterface(spawnedEntity, IID_Ownership);
        let spawnedEntityPlotsCmp = Engine.QueryInterface(spawnedEntity, IID_Plots);

        //define pos(based on the core building pos + the offset), rot, ownership and the plot id 
        plotLocationCmp.SetTurretParent(this.entity, plot.offset);
        plotLocationCmp.SetYRotation(+plot.angle + rot.y);
        plotOwnershipCmp.SetOwner(owner);
        plot.id = spawnedEntity;
        
        //save the raw templatename for the plot and the id of the core building for later use
        let cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
        let templateName = cmpTemplateManager.GetCurrentTemplateName(spawnedEntity);
        
        if (spawnedEntityPlotsCmp){
            spawnedEntityPlotsCmp.plotTemplate = templateName;
            spawnedEntityPlotsCmp.cachedPlotTemplate = templateName; // Also store it in the cache for later usage
            spawnedEntityPlotsCmp.originID = this.entity;
            spawnedEntityPlotsCmp.plotOffset = plot.offset;
        }

        // set raw plots as invulnerable
        let cmpResistance = Engine.QueryInterface(spawnedEntity, IID_Resistance);
        cmpResistance.SetInvulnerability(true);
        
        // Add each plot to the battalion list so it will appear in the UI
        let cmpPlayer = QueryOwnerInterface(this.entity);
        let cmpIdentity = Engine.QueryInterface(spawnedEntity, IID_Identity);
        let entityClasses = cmpIdentity.GetClassesList();
        let cmpBattalion = Engine.QueryInterface(spawnedEntity, IID_Battalion);
        if (!MatchesClassList(entityClasses, ["Resource"]) ){
            if (cmpBattalion){
                cmpPlayer.AddBattalion([spawnedEntity]);
            }
        }
        
        this.UpgradePlotUponCreationIfSpecified(plot);
    }
    
    // Delete all not spawned plots from the list. 
    this.allPlots = spawnedPlots;
    
    // Add rejioned plots to "allPlots"
    for (let plot of this.rejoinedPlots){
        this.allPlots.push(plot);
    }
    this.rejoinedPlots = new Array();
    
    this.plotsHaveSpawned = true;
};

Plots.prototype.SpawnSinglePlot = function (rot, owner, originPlotCmp)
{
    // same concept as the "SpawnPlots" function, but this time to respawn a destroyed plot with the core building still intact
    let spawnedEntity = Engine.AddEntity(this.plotTemplate);
    let plotLocationCmp = Engine.QueryInterface(spawnedEntity, IID_Position);
    let plotOwnershipCmp = Engine.QueryInterface(spawnedEntity, IID_Ownership);
    let plotPlotsCmp = Engine.QueryInterface(spawnedEntity, IID_Plots);

    // new entity means a new ID, which requires the transfer of all required variables for the data to stay relevant and up to date
    plotLocationCmp.SetTurretParent(this.originID, this.plotOffset);
    plotLocationCmp.SetYRotation(rot.y);
    plotOwnershipCmp.SetOwner(owner);
    plotPlotsCmp.originID = this.originID;
    plotPlotsCmp.plotTemplate = this.plotTemplate;
    plotPlotsCmp.cachedPlotTemplate = plotPlotsCmp.plotTemplate;
    plotPlotsCmp.plotOffset = this.plotOffset;

    let cmpArmour = Engine.QueryInterface(spawnedEntity, IID_Resistance);
    cmpArmour.SetInvulnerability(true);

    // find the plot that is destroyed and transfer the ID over to keep the data up to date
    for (let plot of originPlotCmp.allPlots)
    {
        if (plot.id == this.entity) {
            plot.id = spawnedEntity;
            
            // We need to set position and rotation of the new plot. Needed if we use aqueduct mechanic 
            let cmpPosition = Engine.QueryInterface(plot.id, IID_Position);
            if(cmpPosition.IsInWorld()){
                plot.oldPosition = cmpPosition.GetPosition();
                plot.oldRot = cmpPosition.GetRotation();
            }
            break;
        }
    }
    
    return spawnedEntity;
    
};

Plots.prototype.DestroyPlot = function (pos, rot, deathTemplate, plotTemplate, id)
{
    // Spawn the local death entity and the corpse for this building
    let spawnedEntity = Engine.AddLocalEntity(deathTemplate);
    let spawnedEntity2 = Engine.AddLocalEntity("corpse|" + plotTemplate);

    let cmpSpawnedPosition = Engine.QueryInterface(spawnedEntity, IID_Position);
    let cmpSpawnedPosition2 = Engine.QueryInterface(spawnedEntity2, IID_Position);
    cmpSpawnedPosition.JumpTo(pos.x, pos.y);
    cmpSpawnedPosition2.JumpTo(pos.x, pos.y);
    cmpSpawnedPosition.SetYRotation(rot.y);
    cmpSpawnedPosition2.SetYRotation(rot.y);

    let cmpOwnership = Engine.QueryInterface(id, IID_Ownership);
    let cmpSpawnedOwnership = Engine.QueryInterface(spawnedEntity, IID_Ownership);
    let cmpSpawnedOwnership2 = Engine.QueryInterface(spawnedEntity2, IID_Ownership);
    cmpSpawnedOwnership.SetOwner(cmpOwnership.GetOwner());
    cmpSpawnedOwnership2.SetOwner(cmpOwnership.GetOwner());

    let cmpCorpseVisual = Engine.QueryInterface(spawnedEntity2, IID_Visual);
    cmpCorpseVisual.SelectAnimation("death", true, 1.0);
    
    //~ // Add the new entity to the battalion of the plot before the plot gets deleted
    let cmpBattalion = Engine.QueryInterface(id, IID_Battalion);
    let cmpPlayer = QueryOwnerInterface(id);
    let battalionID = cmpBattalion.ownBattalionID;
    
    // destroy the main building after the 2 death entities have been set properly
    Engine.BroadcastMessage(MT_BattalionUpdate, { "delete": true, "id": battalionID, "player": cmpPlayer.playerID });
    Engine.DestroyEntity(id);
};

// This is the aqueduct mechanic
// If A has plots and those plots will be upgraded into something that also has plots we can chain buildings
// If this is set to true, we can make it, so that buildings that are not connected to the source of the chain will loose all not upgraded plots
// Also if a non connected plot will be destroyed it will not spawn a plain plot upon destruction
// If the chain is set intact again, all cores will regain their non-upgraded plots
Plots.prototype.SetChainOfPlotsInactive = function (plotToSetInactive)
{
    let cmpPlots = Engine.QueryInterface(plotToSetInactive.id, IID_Plots); // Component of the core that is set inactive
    
    for (let plot of cmpPlots.allPlots){
        
        let cmpPlotsAttached = Engine.QueryInterface(plot.id, IID_Plots); // Component of the attached plot
        
        let cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
        let currentPlotTemplate = cmpTemplateManager.GetCurrentTemplateName(plot.id);
        if (currentPlotTemplate == cmpPlotsAttached.cachedPlotTemplate){ // If a plot is not upgraded
            
            cmpPlots.active = false;
            
            // Cache old position and move the plot out of the world. Bring back, when the core is active again
            // Plots will not be deleted, but moved out of the world and moved back when set to active
            let cmpPosition = Engine.QueryInterface(plot.id, IID_Position);
            if ((cmpPosition.IsInWorld())){
                plot.oldPosition = cmpPosition.GetPosition();
                plot.oldRot = cmpPosition.GetRotation();
                cmpPosition.MoveOutOfWorld();
            }
        } else{
            cmpPlots.SetChainOfPlotsInactive(plot); // Set all the upgraded plots of this core to inactive
        }
    }
}

Plots.prototype.DestroyPlotsLinkedForDestruction = function ()
{
    if (this.allPlots.length <= 0)
        return;

    if (this.plotsHaveSpawned == false)
        return;

    for (let plot of this.allPlots)
    {
        let cmpPosition = Engine.QueryInterface(plot.id, IID_Position);
        if (plot.linkedDestruction == false)
        {
            let cmpPlots = Engine.QueryInterface(plot.id, IID_Plots);
            cmpPosition.SetTurretParent(INVALID_ENTITY, new Vector3D());
            // Cache plot template if it is needed later. Used for plot chaining
            cmpPlots.cachedPlotTemplate = cmpPlots.plotTemplate;
            cmpPlots.plotTemplate = null;
            cmpPlots.originID = null;  // Delete origin. Needed for plot chaining
            
            //code to destroy non upgraded plots. Only upgraded plots shall remain
            let cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
            let currentPlotTemplate = cmpTemplateManager.GetCurrentTemplateName(plot.id);
            if (currentPlotTemplate == cmpPlots.cachedPlotTemplate){    // If the plot is not upgraded
                let cmpHealth = Engine.QueryInterface(plot.id, IID_Health);
                if (!cmpPosition.IsInWorld()){  // If the plot is not in World, we can savely remove it. It means, that it is not upgraded and that the owner is an inactive plot
                    Engine.DestroyEntity(plot.id);
                } else{
                    this.DestroyPlot(cmpPosition.GetPosition2D(), cmpPosition.GetRotation(), cmpHealth.template.SpawnEntityOnDeath, plot.template, plot.id);
                }
            }
            
            // Here we can set all the disconnected chain of plots to inactive ie we want to chain them and have Zora aqueduct style
            if (this.disableChainedPlotsUponDestruction){
                this.SetChainOfPlotsInactive(plot);
            }

            // make sure to set invulnerability back to false in the case this is a raw plot when the core hub is destroyed
            let cmpArmour = Engine.QueryInterface(plot.id, IID_Resistance);
            cmpArmour.SetInvulnerability(false);
            continue;
        } else {
            let cmpHealth = Engine.QueryInterface(plot.id, IID_Health);
            let maxHistpointsOfLinkedEntity = cmpHealth.GetMaxHitpoints();
            cmpHealth.Reduce(maxHistpointsOfLinkedEntity);
        }
    
        let cmpHealth = Engine.QueryInterface(plot.id, IID_Health);
        this.DestroyPlot(cmpPosition.GetPosition2D(), cmpPosition.GetRotation(), cmpHealth.template.SpawnEntityOnDeath, plot.template, plot.id);
    }
}


Plots.prototype.CheckPlotInvolvement = function ()
{
    // if this entity gets destroyed and has plots, destroy all the plots that are linked for destruction
    this.DestroyPlotsLinkedForDestruction();
    
    let newPlotId = null;
    
    // if this entity has a plot origin or is a raw plot, respawn it
    if (this.plotTemplate != null)
    {
        let cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
        if (!cmpPosition.IsInWorld())
            return INVALID_ENTITY;

        let originPlotCmp = Engine.QueryInterface(this.originID, IID_Plots);
        newPlotId = this.SpawnSinglePlot(cmpPosition.GetRotation(), originPlotCmp.plotOwner, originPlotCmp);
        
         // Add the new entity to the battalion of the plot before the plot gets deleted
        let cmpBattalion = Engine.QueryInterface(this.entity, IID_Battalion);
        let cmpPlayer = QueryOwnerInterface(this.entity);
        // Add the new entity to the battalion of the already existing one
            let battalionID = cmpBattalion.ownBattalionID;
            let allEntitiesInThisBattalion = cmpPlayer.allBattalions.get(battalionID);
            if (allEntitiesInThisBattalion){
                allEntitiesInThisBattalion.push(newPlotId);
            }
            cmpPlayer.allBattalions.set(battalionID, allEntitiesInThisBattalion);
            
            // Make the new entity aware of its own battalion
            let cmpBattalionNewEntity = Engine.QueryInterface(newPlotId, IID_Battalion);
            cmpBattalionNewEntity.SetOwnBattalion(battalionID, cmpBattalion.GetActorSeed());
    }
    
    // If the plot core is inactive and has an owner, we spawn a plot, but must move it out of the world. When the plot will be acitve again, it will be brought back
    if (this.active == false){
        if(!this.originID){ // If it is a single plot left without origin, we shall stop here
            return;
        }
        
        // If the plot has an origin, remove it from World. We bring it back, when the core will be active again.
        let cmpPosition = Engine.QueryInterface(newPlotId, IID_Position);
        cmpPosition.MoveOutOfWorld();
    }
};

// Function to upgrade all plots of this entity. Will be called from elsewhere
Plots.prototype.UpgradePlotsOfEntity = function (templateToUpgradeTo, plotClassesToUpgrade)
{
    for (let plotToCheck of this.allPlots){
        let plotToCheckEntityID = plotToCheck["id"];
        for (let plotClass in plotClassesToUpgrade){
            
            // Get class of the entity
            let cmpIdentity = Engine.QueryInterface(plotToCheckEntityID, IID_Identity);
            if (!cmpIdentity){
                continue;
            }
                
            let entityClasses = cmpIdentity.GetClassesList();
            
            if (!MatchesClassList(entityClasses, plotClass)){
                continue;
            }
            
            let cmpUpgrade = Engine.QueryInterface(plotToCheckEntityID, IID_Upgrade);
            cmpUpgrade.Upgrade(plotClassesToUpgrade[plotClass], false);
        }
    }
}

    
Engine.RegisterComponentType(IID_Plots, "Plots", Plots);
