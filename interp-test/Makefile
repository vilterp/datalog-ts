family.png: family.dot
	cat family.dot | dot -Tpng > family.png

family.dot: family-rules.dl family-facts.dl
	cat family-facts.dl | ./family-rules.dl > family.dot

test-dot: family.dot family-ref.dot
	cmp family.dot family-ref.dot

test-png: family.png family-ref.png
	cmp family.png family-ref.png

clean:
	rm -f family.png
	rm -f family.dot
