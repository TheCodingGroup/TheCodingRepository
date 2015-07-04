TIMER = {
    _clock: {
        main: 0,
	sub:  0,
	div:  0
    },

    _reg: {
        div:  0,
	tima: 0,
	tma:  0,
	tac:  0
    },

    inc: function()
    {
        // Increment by the last opcode's time
        TIMER._clock.sub += Z80._r.m;

	// No opcode takes longer than 4 M-times,
	// so we need only check for overflow once
	if(TIMER._clock.sub >= 4)
	{
	    TIMER._clock.main++;
	    TIMER._clock.sub -= 4;

	    // The DIV register increments at 1/16th
	    // the rate, so keep a count of this
	    TIMER._clock.div++;
	    if(TIMER._clock.div == 16)
	    {
	        TIMER._reg.div = (TIMER._reg.div+1) & 255;
		TIMER._clock.div = 0;
	    }
	}
    check: function()
    {
        if(TIMER._reg.tac & 4)
	{
	    switch(TIMER._reg.tac & 3)
	    {
	        case 0: threshold = 64; break;		// 4K
		case 1: threshold =  1; break;		// 256K
		case 2: threshold =  4; break;		// 64K
		case 3: threshold = 16; break;		// 16K
	    }

	    if(TIMER._clock.main >= threshold) TIMER.step();
	}
    },

    step: function()
    {
        // Step the timer up by one
	TIMER._clock.main = 0;
    	TIMER._reg.tima++;

	if(TIMER._reg.tima > 255)
	{
	    // At overflow, refill with the Modulo
	    TIMER._reg.tima = TIMER._reg.tma;

	    // Flag a timer interrupt to the dispatcher
	    MMU._if |= 4;
	}
    },

    rb: function(addr)
    {
	switch(addr)
	{
	    case 0xFF04: return TIMER._reg.div;
	    case 0xFF05: return TIMER._reg.tima;
	    case 0xFF06: return TIMER._reg.tma;
	    case 0xFF07: return TIMER._reg.tac;
	}
    },

    wb: function(addr, val)
    {
	switch(addr)
	{
	    case 0xFF04: TIMER._reg.div = 0; break;
	    case 0xFF05: TIMER._reg.tima = val; break;
	    case 0xFF06: TIMER._reg.tma = val; break;
	    case 0xFF07: TIMER._reg.tac = val & 7; break;
	}
    }

	// Check whether a step needs to be made in the timer
	TIMER.check();
    }
};
