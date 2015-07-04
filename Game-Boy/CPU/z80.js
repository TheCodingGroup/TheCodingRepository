Z80 = {
    // Time clock: The Z80 holds two types of clock (m and t)
    _clock: {m:0, t:0},

    // Register set
    _r: {
        a:0, b:0, c:0, d:0, e:0, h:0, l:0, f:0,    // 8-bit registers
        pc:0, sp:0,                                // 16-bit registers
        m:0, t:0                                   // Clock for last instr
    }
};

Z80 = {
    // Internal state
    _clock: {m:0, t:0},
    _r: {a:0, b:0, c:0, d:0, e:0, h:0, l:0, f:0, pc:0, sp:0, m:0, t:0},

    // Add E to A, leaving result in A (ADD A, E)
    ADDr_e: function() {
        Z80._r.a += Z80._r.e;                      // Perform addition
        Z80._r.f = 0;                              // Clear flags
        if(!(Z80._r.a & 255)) Z80._r.f |= 0x80;    // Check for zero
        if(Z80._r.a > 255) Z80._r.f |= 0x10;       // Check for carry
        Z80._r.a &= 255;                           // Mask to 8-bits
        Z80._r.m = 1; Z80._r.t = 4;                // 1 M-time taken
    }

    // Compare B to A, setting flags (CP A, B)
    CPr_b: function() {
        var i = Z80._r.a;                          // Temp copy of A
        i -= Z80._r.b;                             // Subtract B
        Z80._r.f |= 0x40;                          // Set subtraction flag
        if(!(i & 255)) Z80._r.f |= 0x80;           // Check for zero
        if(i < 0) Z80._r.f |= 0x10;                // Check for underflow
        Z80._r.m = 1; Z80._r.t = 4;                // 1 M-time taken
    }

    // No-operation (NOP)
    NOP: function() {
        Z80._r.m = 1; Z80._r.t = 4;                // 1 M-time taken
    }
};


    // Push registers B and C to the stack (PUSH BC)
    PUSHBC: function() {
        Z80._r.sp--;                               // Drop through the stack
	MMU.wb(Z80._r.sp, Z80._r.b);               // Write B
	Z80._r.sp--;                               // Drop through the stack
	MMU.wb(Z80._r.sp, Z80._r.c);               // Write C
	Z80._r.m = 3; Z80._r.t = 12;               // 3 M-times taken
    },

    // Pop registers H and L off the stack (POP HL)
    POPHL: function() {
        Z80._r.l = MMU.rb(Z80._r.sp);              // Read L
	Z80._r.sp++;                               // Move back up the stack
	Z80._r.h = MMU.rb(Z80._r.sp);              // Read H
	Z80._r.sp++;                               // Move back up the stack
	Z80._r.m = 3; Z80._r.t = 12;               // 3 M-times taken
    }

    // Read a byte from absolute location into A (LD A, addr)
    LDAmm: function() {
        var addr = MMU.rw(Z80._r.pc);              // Get address from instr
	Z80._r.pc += 2;                            // Advance PC
	Z80._r.a = MMU.rb(addr);                   // Read from address
	Z80._r.m = 4; Z80._r.t=16;                 // 4 M-times taken
    }
    reset: function() {
	Z80._r.a = 0; Z80._r.b = 0; Z80._r.c = 0; Z80._r.d = 0;
	Z80._r.e = 0; Z80._r.h = 0; Z80._r.l = 0; Z80._r.f = 0;
	Z80._r.sp = 0;
	Z80._r.pc = 0;      // Start execution at 0

	Z80._clock.m = 0; Z80._clock.t = 0;
    }
while(true)
{
    var op = MMU.rb(Z80._r.pc++);              // Fetch instruction
    Z80._map[op]();                            // Dispatch
    Z80._r.pc &= 65535;                        // Mask PC to 16 bits
    Z80._clock.m += Z80._r.m;                  // Add time to CPU clock
    Z80._clock.t += Z80._r.t;
}

Z80._map = [
    Z80._ops.NOP,
    Z80._ops.LDBCnn,
    Z80._ops.LDBCmA,
    Z80._ops.INCBC,
    Z80._ops.INCr_b,
    ...
];
while(true)
{
    Z80._map[MMU.rb(Z80._r.pc++)]();
    Z80._r.pc &= 65535;
    Z80._clock.m += Z80._r.m;
    Z80._clock.t += Z80._r.t;

    GPU.step();
}
Z80 = {
    _r: {
        ime: 0,
        ...
    },

    reset: function()
    {
        ...
	Z80._r.ime = 1;
    },

    // Disable IME
    DI: function()
    {
    	Z80._r.ime = 0;
	Z80._r.m = 1;
	Z80._r.t = 4;
    },

    // Enable IME
    EI: function()
    {
    	Z80._r.ime = 1;
	Z80._r.m = 1;
	Z80._r.t = 4;
    }
};
Z80.js: Vblank interrupt handler
Z80 = {
    _ops: {
	...

        // Start vblank handler (0040h)
        RST40: function()
        {
            // Disable further interrupts
    	    Z80._r.ime = 0;
    
    	    // Save current SP on the stack
    	    Z80._r.sp -= 2;
    	    MMU.ww(Z80._r.sp, Z80._r.pc);
    
    	    // Jump to handler
    	    Z80._r.pc = 0x0040;
	    Z80._r.m = 3;
    	    Z80._r.t = 12;
        },
        
        // Return from interrupt (called by handler)
        RETI: function()
        {
	    // Restore interrupts
	    Z80._r.ime = 1;

	    // Jump to the address on the stack
	    Z80._r.pc = MMU.rw(Z80._r.sp);
	    Z80._r.sp += 2;

	    Z80._r.m = 3;
	    Z80._r.t = 12;
        }
    }
};

while(true)
{
    // Run execute for this instruction
    var op = MMU.rc(Z80._r.pc++);
    Z80._map[op]();
    Z80._r.pc &= 65535;
    Z80._clock.m += Z80._r.m;
    Z80._clock.t += Z80._r.t;
    Z80._r.m = 0;
    Z80._r.t = 0;

    // If IME is on, and some interrupts are enabled in IE, and
    // an interrupt flag is set, handle the interrupt
    if(Z80._r.ime && MMU._ie && MMU._if)
    {
        // Mask off ints that aren't enabled
        var ifired = MMU._ie & MMU._if;

	if(ifired & 0x01)
	{
	    MMU._if &= (255 - 0x01);
	    Z80._ops.RST40();
	}
    }

    Z80._clock.m += Z80._r.m;
    Z80._clock.t += Z80._r.t;
}
Timer.js: Clock increment
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
Z80.js: Dispatcher
while(true)
{
    // Run execute for this instruction
    var op = MMU.rc(Z80._r.pc++);
    Z80._map[op]();
    Z80._r.pc &= 65535;
    Z80._clock.m += Z80._r.m;
    Z80._clock.t += Z80._r.t;

    // Update the timer
    TIMER.inc();

    Z80._r.m = 0;
    Z80._r.t = 0;

    // If IME is on, and some interrupts are enabled in IE, and
    // an interrupt flag is set, handle the interrupt
    if(Z80._r.ime && MMU._ie && MMU._if)
    {
        // Mask off ints that aren't enabled
        var ifired = MMU._ie & MMU._if;

	if(ifired & 0x01)
	{
	    MMU._if &= (255 - 0x01);
	    Z80._ops.RST40();
	}
    }

    Z80._clock.m += Z80._r.m;
    Z80._clock.t += Z80._r.t;

    // Update timer again, in case a RST occurred
    TIMER.inc();
}
