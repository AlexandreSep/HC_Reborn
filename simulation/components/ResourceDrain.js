function ResourceDrain() {}

ResourceDrain.prototype.Schema =
	"<a:help>Drains nearby resources.</a:help>" +
	"<element name='Radius' a:help='The radius we want to check for resources'>" +
		"<data type='positiveInteger'/>" +
	"</element>"+
	"<element name='VisualEffectDuration' a:help='How long the visual effect shall last in milliseconds'>" +
		"<data type='positiveInteger'/>" +
	"</element>"+
	"<element name='TickRate' a:help='The radius we want to check for resources'>" +
		"<data type='positiveInteger'/>" +
	"</element>"+
    "<element name='DepleteResource' a:help='Deplete resource or not'>" +
		Resources.BuildSchema("boolean", [], true) +
	"</element>" +
    "<element name='MaxResourceSpotsToDrainSimultaneously' a:help='Trickle Rates'>" +
		Resources.BuildSchema("nonNegativeDecimal", [], true) +
	"</element>" +
    "<element name='ResourcesPerTick' a:help='Trickle Rates'>" +
		Resources.BuildSchema("nonNegativeDecimal", [], true) +
	"</element>";

ResourceDrain.prototype.Init = function()
{
    let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);

    this.depleteResource = (this.template.DepleteResource);
    this.tickRate = +this.template.TickRate;
    this.visualEffectDuration = +this.template.VisualEffectDuration;
    this.timer = cmpTimer.SetInterval(this.entity, IID_ResourceDrain, "DrainResourcesInReach", 0, this.tickRate, null);

    this.players = [0,1,2,3,4,5,6,7,8,9];
};

ResourceDrain.prototype.DrainResourcesInReach = function()
{
    var cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);

    let radius = ApplyValueModificationsToEntity("ResourceDrain/Radius", +this.template.Radius, this.entity);
    let resourcesPerTick = new Array();
    let maxResourceSpotsToDrainSimultaneously = new Array();

    // Calculate drain rate and how many resources may be drained simulatneously
    for (let resource in this.template.ResourcesPerTick){
	resourcesPerTick[resource] = ApplyValueModificationsToEntity("ResourceDrain/ResourcesPerTick/" + resource, +this.template.ResourcesPerTick[resource], this.entity);
	maxResourceSpotsToDrainSimultaneously[resource] = ApplyValueModificationsToEntity("ResourceDrain/MaxResourceSpotsToDrainSimultaneously/" + resource, +this.template.MaxResourceSpotsToDrainSimultaneously[resource], this.entity);
    }
    
    let currentlyDraining = new Array(); // Stores how many or each type we drain ant the moment
    let currentResourcesInReach = cmpRangeManager.ExecuteQuery(this.entity, 0, radius, this.players, IID_ResourceSupply);

    // Now drain each resource in reach if allowed
    for(let resourceEntity of currentResourcesInReach){
        let name = Engine.QueryInterface(resourceEntity, IID_Identity).GetGenericName();

        let cmpResourceSupply = Engine.QueryInterface(resourceEntity, IID_ResourceSupply);
        
        let resourceType = cmpResourceSupply.GetType();
        let resourceTypeGeneric = resourceType.generic;
        let resourceTypeSpecific = resourceType.specific;
        let resourceAmountAvailable = cmpResourceSupply.GetCurrentAmount();
	let resource = resourceTypeGeneric + "." + resourceTypeSpecific;

	if (!currentlyDraining[resource]){
	    currentlyDraining[resource] = 0;
	}
	
	
        // If we have reached the limit for that resource type, do not drain that resoruce
        if ( !(currentlyDraining[resource] < maxResourceSpotsToDrainSimultaneously[resource]) ){
            continue;
        }

        ++currentlyDraining[resource];

	let amountResourceTaken = {};
	amountResourceTaken.amount = 0;

	if (this.depleteResource[resource].startsWith("t")){
	    amountResourceTaken = cmpResourceSupply.TakeResources(resourcesPerTick[resource]);
	} else {
	    amountResourceTaken.amount = resourcesPerTick[resource];
	}

        let cmpPlayer = QueryOwnerInterface(this.entity);
        cmpPlayer.AddResource(resourceTypeGeneric, amountResourceTaken.amount);

        // Add a visual indication
        cmpResourceSupply.IndicateResourceDrain(this.visualEffectDuration);
    }
    
}

Engine.RegisterComponentType(IID_ResourceDrain, "ResourceDrain", ResourceDrain);
