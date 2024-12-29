function SetOwnerID() {}

SetOwnerID.prototype.Schema =
	"<element name='OwnerID' a:help='The ID of the new owner'>" +
	"<data type='integer'/>" +
	"</element>";

SetOwnerID.prototype.Init = function()
{
	let ownerID = ApplyValueModificationsToEntity("SetOwnerID/OwnerID", +this.template.OwnerID, this.entity);
    var cmpOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
	cmpOwnership.SetOwner(ownerID);
}

Engine.RegisterComponentType(IID_SetOwnerID, "SetOwnerID", SetOwnerID);