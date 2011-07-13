var DefensePenetration = function(initObject){
	this.reduction = initObject['reduction'] || null;
	this.reductionPercent = initObject['reductionPercent'] || null;
	this.penetration = initObject['penetration'] || null;
	this.penetrationPercent = initObject['penetrationPercent'] || null; 
}

// DamageReduction Object: Represents both armor and magic resist.
var DamageReduction = function(amount, champion) {
	this.amount = amount;
	this.champion = champion || null;
}

DamageReduction.prototype.mitigate = function(damage, defensePenetration) {
    var amount = this.amount;
    if (defensePenetration != undefined) {
		if (defensePenetration.reductionPercent) {
			amount = amount - (amount * defensePenetration.reductionPercent);
		}
		if (defensePenetration.reduction) {
			amount = amount - defensePenetration.reduction;
		}		
		if (amount > 0 && defensePenetration.penetrationPercent) {
			amount = amount - (amount * defensePenetration.penetrationPercent);
			amount = amount < 0 ? 0 : amount;
		}		
		if (amount > 0 && defensePenetration.penetration) {
			amount = amount - defensePenetration.penetration;
			amount = amount < 0 ? 0 : amount;			
		}					
	}
 
    return damage * this.multiplier(amount);
}

DamageReduction.prototype.applyHit = function(hitObject) {
	return this.mitigate(hitObject.amount, hitObject.defensePenetration);
}

DamageReduction.prototype.multiplier = function(amount) {
	var amount = (amount == undefined) ? this.amount : amount;
	if (amount >= 0) {
    	return 100 / (100 + amount);
    } else if (amount < 0) {
    	return 1 + Math.abs(amount) / 100;
	}
}

DamageReduction.prototype.effectiveHealth = function(health) {
	var health = health || 0;
	if (this.champion) {
		health = this.champion.health();
	}
	if (health == 0){
		return 0;
	}
	if (this.amount >= 0) {
		return health * (100 + this.amount) / 100;
	} else if (this.amount) {
		return health * 100 / (100 + Math.abs(this.amount));
	}
}

// Hit Object: This object represents a single hit or strike to a target. Hits are used
// to calculate damage done to a target after armor, magic resists and defense penetration are 
// applied. Hits are applied to a ``DamageReduction`` object via the ``DamageReduction.applyHit`` method.

var Hit = function(amount, damageType, defensePenetration) {
	// @param damageType - Magic or physical.
	// @param amount - Amount of damage.
	// @param defensePenetration - DefensePenetration object.
	
	this.amount = amount;
	this.damageType = damageType;
	this.defensePenetration = defensePenetration;
}

// Champion Object: Simple object to represent a champion.
var Champion = function(champName){
	this.name = champName;
	// Base Armor
	this._armor = null;
	this._armorPerLevel = null;
	// Base MR
	this._magicResist = null;
	this._magicResistPerLevel = null
	this._health = null;
	this._healthPerLevel = null;
	this._mana = null;
	this._manaPerLevel = null;
	// Base attack damage.
	this._attackDamage = null;
	this._attackDamagePerLevel = null;
	this._level = 0;
	
	//If you want to add additional armor or MR use the following properties
	this.armorFromItems = 0;
	this.magicResistFromItems = 0;
	this.healthFromItems = 0;
}

Champion.prototype.armor = function() {
	return new DamageReduction(this._armor + this.armorFromItems + (this._armorPerLevel * this._level), this);
}

Champion.prototype.magicResist = function(){
	return new DamageReduction(this._magicResist + this.magicResistFromItems + (this._magicResistPerLevel* this._level), this);
}

Champion.prototype.health = function() {
	return this._health + this.healthFromItems + (this._healthPerLevel * this._level);
}

Champion.prototype.mana = function(){
	return this._mana + (this._manaPerLevel * this._level);
}

Champion.prototype.attackDamage = function(){
	return this._attackDamage + (this._attackDamagePerLevel * this._level);
}

Champion.prototype.level = function(){
	return this._level + 1;
}

Champion.prototype.setLevel = function(level) {
	if (!(level <= 18 && level >= 1)) {
		throw RangeError;
	}
	this._level = level - 1;
}

Champion.prototype.setBaseMana = function(mana, perLevel){
	this._mana = mana;
	this._manaPerLevel = perLevel;
}

Champion.prototype.setBaseHealth = function(health, perLevel){
	this._health = health;
	this._healthPerLevel = perLevel;
}

Champion.prototype.setBaseArmor = function(armor, perLevel){
	this._armor = armor;
	this._armorPerLevel = perLevel;
}

Champion.prototype.setBaseMagicResist = function(magicResist, perLevel){
	this._magicResist = magicResist;
	this._magicResistPerLevel = perLevel;
}

Champion.prototype.setBaseAttackDamage = function(attackDamage, perLevel) {
	this._attackDamage = attackDamage;
	this._attackDamagePerLevel = perLevel;
}


var perLevelRegex = /^([^\s]*)\s\(\+\s?([^\)]*)\)$/;
function parsePerLevelInc(value){
	var result = {
		value: parseFloat(value),
		perLevel:0
	};
	if (value == null || value == undefined) {
		return result;
	}
	m = value.match(perLevelRegex);
	if (!m) {
		return result
	} else {
		result.value = parseFloat(m[1]);
		result.perLevel = parseFloat(m[2]);
	}
	return result;
}

// championFactory creates Champion instances from champion stat objects in champs.js
function championFactory(champName, championObject){
	champion = new Champion(champName);
	
	function setter(setterMethod, valueObject){
		champion[setterMethod](valueObject.value, valueObject.perLevel);
	}	
	
	setter("setBaseHealth", parsePerLevelInc(championObject["health"]));
	setter("setBaseAttackDamage", parsePerLevelInc(championObject["damage"]));
	setter("setBaseArmor", parsePerLevelInc(championObject["armor"]));
	setter("setBaseMagicResist", parsePerLevelInc(championObject["magic res."]));
	setter("setBaseMana", parsePerLevelInc(championObject["mana"]));
	return champion;
}