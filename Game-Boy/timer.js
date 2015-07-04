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

	// Check whether a step needs to be made in the timer
	TIMER.check();
    }
};
