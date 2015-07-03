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
