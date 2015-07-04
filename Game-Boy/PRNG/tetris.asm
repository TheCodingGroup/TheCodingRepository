BLK_NEXT = 0xC203
BLK_CURR = 0xC213
REG_DIV  = 0x04

NBLOCK: ld hl, BLK_CURR		; Bring the next block
	ld a, (BLK_NEXT)	; forward to current
	ld (hl),a
	and 0xFC		; Clear out any rotations
	ld c,a			; and hold onto previous

	ld h,3			; Try the following 3 times

.seed:	ldh a, (REG_DIV)	; Get a "random" seed
	ld b,a
.loop:	xor a			; Step down in sevens
.seven:	dec b			; until zero is reached
	jr z, .next		; This loop is equivalent
	inc a			; to (a%7)*4
	inc a
	inc a
	inc a
	cp 28
	jr z, .loop
	jr .seven

.next:	ld e,a			; Copy the new value
	dec h			; If this is the
	jr z, .end		; last try, just use this
	or c			; Otherwise check
	and 0xFC		; against the previous block
	cp c			; If it's the same again,
	jr z, .seed		; try another random number
.end:	ld a,e			; Get the copy back
	ld (BLK_NEXT), a	; This is our next block
