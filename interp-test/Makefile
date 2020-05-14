family.png: family.dot
	cat family.dot | dot -Tpng > family.png

family.dot: family-rules.dl family-facts.dl
	cat family-facts.dl | ./family-rules.dl > family.dot

test: family.png family-ref.png
	cmp family.png family-ref.png

clean:
	rm -f family.png
	rm -f family.dot
